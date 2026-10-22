import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const projectRef = "qwfrqychokvhdzakibid";
const workspace = resolve(fileURLToPath(new URL("..", import.meta.url)));
const stateRoot = join(process.env.LOCALAPPDATA ?? join(homedir(), ".local", "share"), "home-care-assistant");
const profile = join(stateRoot, "supabase-profile.yaml");
const cliHome = join(stateRoot, "supabase-cli");
const identityFile = join(cliHome, "identity.json");

function environment() {
  for (const name of ["SUPABASE_ACCESS_TOKEN","SUPABASE_API_URL","SUPABASE_DASHBOARD_URL","SUPABASE_PROJECT_HOST","SUPABASE_POOLER_HOST"]) {
    if (process.env[name]) throw new Error(`Remove ${name} from this invocation: the project uses its explicitly authenticated profile.`);
  }
  const env = {...process.env,SUPABASE_HOME:cliHome};
  delete env.SUPABASE_PROFILE;
  delete env.SUPABASE_WORKDIR;
  delete env.SUPABASE_NO_KEYRING;
  return env;
}
function execute(args, capture = true) {
  const result = spawnSync("supabase", [...args,"--profile",profile,"--workdir",workspace], {env:environment(),encoding:"utf8",stdio:capture?["ignore","pipe","pipe"]:"inherit"});
  if (result.error || result.status !== 0) throw new Error(capture ? result.stderr?.trim() || "Supabase command failed." : "Supabase command failed.");
  return result.stdout;
}
function identity() {
  return JSON.parse(execute(["whoami","--output-format","json"]));
}
function verifyAccess(user) {
  const linked = readFileSync(join(workspace,"supabase",".temp","project-ref"),"utf8").trim();
  if (linked !== projectRef) throw new Error("Linked project differs from the approved Home Care Assistant target.");
  const projects = JSON.parse(execute(["projects","list","-o","json"]));
  if (!projects.some((project) => (project.id ?? project.ref) === projectRef)) throw new Error("The authenticated account cannot access the approved project. Run the project login; do not relink to another project.");
  if (existsSync(identityFile)) {
    const expected = JSON.parse(readFileSync(identityFile,"utf8"));
    if (expected.userId !== user.id || expected.projectRef !== projectRef) throw new Error("Supabase identity changed. The project command was stopped before execution; authenticate the approved account again.");
  } else throw new Error("Project identity has not been pinned. Run node scripts/supabase-project.mjs login once.");
}

export function runProjectCommand(args) {
  if (args.some((argument) => /^--(?:profile|workdir|project-ref|db-url)(?:=|$)/.test(argument))) throw new Error("Target/profile overrides are not accepted by the project wrapper.");
  if (["unlink","logout"].includes(args[0]) || args[0] === "projects" && args[1] !== "list" || args[0] === "db" && args[1] === "reset" || args[0] === "migration" && args[1] === "repair") throw new Error("This operation is outside the project update workflow. Local resets use the backed-up, explicitly authorized test harness.");
  if (args[0] === "login") {
    mkdirSync(cliHome,{recursive:true});
    writeFileSync(profile,"name: home-care-assistant\napi_url: https://api.supabase.com\ndashboard_url: https://supabase.com/dashboard\nproject_host: supabase.co\npooler_host: supabase.com\n",{mode:0o600});
    execute(["login","--name","home-care-assistant","--output-format","text","--agent","no",...args.slice(1)],false);
    const user = identity();
    const linked = readFileSync(join(workspace,"supabase",".temp","project-ref"),"utf8").trim();
    const projects = JSON.parse(execute(["projects","list","-o","json"]));
    if (linked !== projectRef || !projects.some((project) => (project.id ?? project.ref) === projectRef)) throw new Error("Login finished with an account that cannot access the approved project; identity was not pinned.");
    writeFileSync(identityFile,JSON.stringify({projectRef,userId:user.id},null,2)+"\n",{mode:0o600});
    console.log(JSON.stringify({authenticated:true,profile:"home-care-assistant",username:user.username,projectRef}));
    return;
  }
  const user = identity();
  verifyAccess(user);
  if (!args.length || args[0] === "doctor") {
    console.log(JSON.stringify({authenticated:true,profile:"home-care-assistant",username:user.username,projectRef,cli:execute(["--version"]).trim()}));
    return;
  }
  if (args[0] === "logout") throw new Error("Use an explicit project login to refresh this account; broad logout is intentionally not part of the workflow.");
  execute(args,false);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { runProjectCommand(process.argv.slice(2)); }
  catch (error) { console.error(error instanceof Error ? error.message : "Project command failed."); process.exitCode=1; }
}
