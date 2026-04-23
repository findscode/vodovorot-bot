const TG_MAX = 4096;

export function splitForTelegram(text: string): string[] {
  if (text.length <= TG_MAX) return [text];
  const parts: string[] = [];
  let rest = text;
  while (rest.length > 0) {
    if (rest.length <= TG_MAX) {
      parts.push(rest);
      break;
    }
    let cut = rest.lastIndexOf('\n\n', TG_MAX);
    if (cut < TG_MAX / 2) cut = rest.lastIndexOf(' ', TG_MAX);
    if (cut < TG_MAX / 2) cut = TG_MAX;
    parts.push(rest.slice(0, cut).trimEnd());
    rest = rest.slice(cut).trimStart();
  }
  return parts;
}

export { TG_MAX };
