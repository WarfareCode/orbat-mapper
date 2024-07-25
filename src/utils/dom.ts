export const isClient = typeof window !== "undefined";

export function sanitizeHTML(str: string) {
  const temp = document.createElement("div");
  temp.textContent = str;
  return temp.innerHTML;
}

export async function toDom(xmlString: string) {
  // https://github.com/placemark/togeojson#protips
  const xmldom = await import("@xmldom/xmldom");
  return new xmldom.DOMParser().parseFromString(xmlString, "text/xml");
}

export function getErrorMessage(e: unknown) {
  if (e instanceof Error) {
    return e.message;
  } else if (typeof e === "string") {
    return e;
  } else {
    return "Unknown error";
  }
}
