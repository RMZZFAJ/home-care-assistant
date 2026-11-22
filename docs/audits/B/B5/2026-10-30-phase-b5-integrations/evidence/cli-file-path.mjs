import { realpathSync, statSync } from "node:fs";
import { basename } from "node:path";

// The operator selects an installed CLI file. Node must receive its canonical
// filename, never an option such as --import that merely ends with that name.
export function checkedCliPath(input) {
  if (typeof input !== "string" || !input || input.startsWith("-")) throw Error("Pass an installed Playwright CLI file");
  const cli = realpathSync(input);
  if (basename(cli) !== "playwright-cli.js" || !statSync(cli).isFile()) throw Error("Pass an installed Playwright CLI file");
  return cli;
}
