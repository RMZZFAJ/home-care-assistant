"""Record the observed Draft PR and CI; no merge, deployment or branch deletion."""
from pathlib import Path
from datetime import datetime, timezone, timedelta
import json
import subprocess

ROOT=Path(__file__).resolve().parents[4]
OUT=Path(__file__).resolve().parent


def gh(*args):
    return json.loads(subprocess.check_output(["gh",*args],cwd=ROOT).decode("utf-8"))


def main():
    pr=gh("pr","view","6","--repo","RMZZFAJ/home-care-assistant","--json","number,url,isDraft,state,baseRefName,headRefName,headRefOid,statusCheckRollup")
    assert pr["isDraft"] and pr["state"]=="OPEN" and pr["baseRefName"]=="master" and pr["headRefName"]=="audit/phase-b"
    runs=gh("run","list","--repo","RMZZFAJ/home-care-assistant","--branch","audit/phase-b","--limit","3","--json","databaseId,headSha,status,conclusion,url,event")
    now=datetime.now(timezone.utc).astimezone(timezone(timedelta(hours=-3))).isoformat()
    snapshot={"captured_at_America_Sao_Paulo":now,"scope":"FIRST_PUBLICATION_SNAPSHOT;final provenance commit will have a newer HEAD;consult PR for latest SHA checks","pull_request":pr,"workflow_runs":runs,"expected_downstream_jobs":["browser (chromium)","browser (mobile)","browser (ios)","database-and-browser"],"production":"NOT_VERIFIED;no deliberate deploy or merge","master_preserved":"34dcb835c5c49068e0417f7306eb4e501aa868bc"}
    (OUT/"evidence/PR_PUBLICATION.json").write_text(json.dumps(snapshot,ensure_ascii=False,indent=2)+"\n",encoding="utf-8",newline="\n")
    path=OUT/"CHECKPOINT.md"
    body=path.read_text(encoding="utf-8")
    start=body.index("## Validação e publicação")
    body=body[:start]+"""## Validação e publicação concluídas

27 verificações documentais passaram, mais a verificação dos hashes do
manifesto. Markdown em521 arquivos, contratos estáticos e diff checks
passaram com Node24.22.0/npm11.21.1. Nenhuma suíte funcional local foi
repetida por texto.

Commit de conteúdo `ddb2b695cf363f3e8116802ffed4334f7fa98b7a` publicado por
push em audit/phase-b. [Draft PR#6](https://github.com/RMZZFAJ/home-care-assistant/pull/6)
aberto efetivamente para master e confirmado OPEN/isDraft=true. Registro
original da CI em [PR_PUBLICATION.json](evidence/PR_PUBLICATION.json),
com SHA e instante próprios. Esta atualização documental gera HEAD novo:
os checks do primeiro snapshot não certificam o último candidato. O estado
mais recente fica no PR e na entrega final, sem esperar toda a CI.

SHA final é o commit que contém este checkpoint, resolvido por Git/ref;
não inserir hash autorreferente no manifesto. Nenhum merge, exclusão de
branch, criação de branch D ou promoção para produção. P02 individual segue
OWNER_REVIEW_REQUIRED; D NÃO INICIADA e produção NO-GO.

Node portátil24.22.0 verificado por SHA256 oficial, sem mudar Node global;
npm11.21.1. Python .venv somente para documentação. Nenhuma leitura de
.env.local, DB/Auth/Storage, restore, contratação, envio ou patch funcional.
"""
    body+="\n## Checks observados no primeiro snapshot\n\n"
    for check in pr["statusCheckRollup"]:
        name=check.get("name",check.get("context","unknown"))
        state=check.get("conclusion") or check.get("status") or check.get("state")
        body+=f"- {name}: {state}.\n"
    body+="\nJobs browser Chromium/mobile/iOS e agregado dependem do banco conforme\nworkflow; ausência momentânea de check não significa sucesso. Preview\nComments não substitui os gates CI. Não aguardar a conclusão nesta missão.\n"
    path.write_text(body,encoding="utf-8",newline="\n")
    for name in ["README.md","PHASE_C_FINAL_PART2_REPORT.md","BRANCH_AND_PROVENANCE_REPORT.md"]:
        path=OUT/name
        body=path.read_text(encoding="utf-8")
        body+="\n## Publicação observada\n\n[Draft PR#6](https://github.com/RMZZFAJ/home-care-assistant/pull/6) aberto de\naudit/phase-b para master; conteúdo publicado por commit/push. Snapshot da\nCI em PR_PUBLICATION.json identifica seu próprio SHA; HEAD final e checks\nmais recentes são resolvidos no PR/Git, sem CI verde presumida. Sem merge,\ncleanup de branches, deploy deliberado ou início D.\n"
        path.write_text(body,encoding="utf-8",newline="\n")
    print(json.dumps({"pr":pr["url"],"draft":pr["isDraft"],"snapshot_sha":pr["headRefOid"],"runs":runs},ensure_ascii=False))


if __name__=="__main__":main()
