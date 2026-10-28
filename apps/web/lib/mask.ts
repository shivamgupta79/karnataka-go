const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const LINK = /\b(?:https?:\/\/|www\.)\S+/gi;
const PHONE = /\+?\d[\d\s\-().]{7,}\d/g;

/** Masks emails, links and phone numbers typed in chat ("contact sharing is off"). */
export function maskContacts(text: string): { text: string; masked: boolean } {
  let masked = false;
  const hide = () => { masked = true; return "[hidden]"; };
  const out = text.replace(EMAIL, hide).replace(LINK, hide).replace(PHONE, hide);
  return { text: out, masked };
}
