"""KarnatakaGo optimizer: safety-weighted routing with skippable stops (OR-Tools).

Run:  uvicorn main:app --port 8000
"""
from fastapi import FastAPI
from ortools.constraint_solver import pywrapcp, routing_enums_pb2
from pydantic import BaseModel

app = FastAPI(title="KarnatakaGo optimizer")


class Req(BaseModel):
    time_matrix: list[list[int]]   # minutes, node 0 = depot / start
    risk_matrix: list[list[int]]   # risk points per edge (night, ghat, weather, isolation)
    scores: list[float]            # place scores (node 0 ignored); skipping a node costs its score
    costs: list[float]             # money cost per node
    budget: float
    max_minutes: int = 540
    w_time: float = 1.0
    w_risk: float = 2.0


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/optimize")
def optimize(req: Req):
    t, r = req.time_matrix, req.risk_matrix
    n = len(t)
    mgr = pywrapcp.RoutingIndexManager(n, 1, 0)
    routing = pywrapcp.RoutingModel(mgr)

    def arc_cost(i, j):
        a, b = mgr.IndexToNode(i), mgr.IndexToNode(j)
        return int(req.w_time * t[a][b] + req.w_risk * r[a][b])

    routing.SetArcCostEvaluatorOfAllVehicles(routing.RegisterTransitCallback(arc_cost))

    def travel(i, j):
        return t[mgr.IndexToNode(i)][mgr.IndexToNode(j)]

    routing.AddDimension(routing.RegisterTransitCallback(travel), 30, req.max_minutes, True, "Time")

    # Skipping a place costs its score, so low-value places are dropped first.
    for node in range(1, n):
        routing.AddDisjunction([mgr.NodeToIndex(node)], int(req.scores[node] * 100))

    p = pywrapcp.DefaultRoutingSearchParameters()
    p.first_solution_strategy = routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    p.local_search_metaheuristic = routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    p.time_limit.seconds = 2
    sol = routing.SolveWithParameters(p)
    if not sol:
        return {"status": "no_solution"}

    order, i = [], routing.Start(0)
    while not routing.IsEnd(i):
        order.append(mgr.IndexToNode(i))
        i = sol.Value(routing.NextVar(i))
    total = sum(req.costs[k] for k in order)
    return {
        "status": "ok",
        "order": order,
        "dropped": [k for k in range(1, n) if k not in order],
        "total_cost": total,
        "within_budget": total <= req.budget,
    }
