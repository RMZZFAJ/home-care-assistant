// Isolated interoperability probe. Not the production issuance pipeline.
import {readFileSync,writeFileSync,existsSync} from "node:fs";
import {join,resolve} from "node:path";
import {randomBytes,createHash} from "node:crypto";
import {spawnSync} from "node:child_process";
import {PDFDocument,StandardFonts} from "pdf-lib";
import {PDF,P12Signer} from "@libpdf/core";
const out=resolve("output/phase-d-work/d4-poc"),keys=join(process.env.LOCALAPPDATA,"home-care-assistant","signature-poc"),openssl="C:/Program Files/Git/usr/bin/openssl.exe";
if(!existsSync(keys))throw new Error("Create protected local test custody first");
const passFile=join(keys,"passphrase"),passArg="file:"+passFile;
if(!existsSync(passFile))writeFileSync(passFile,randomBytes(48).toString("base64url"),{flag:"wx"});
function run(args){const result=spawnSync(openssl,args,{encoding:"utf8",windowsHide:true});if(result.status!==0){writeFileSync(join(out,"openssl-last-error.log"),result.stderr);throw new Error("OpenSSL operation failed: "+args[0]);}return result.stdout;}
const key=name=>join(keys,name),file=name=>join(out,name);
if(!existsSync(key("root.crt"))){
 run(["req","-new","-x509","-newkey","rsa:3072","-passout",passArg,"-keyout",key("root.key"),"-out",key("root.crt"),"-days","3650","-sha256","-subj","/CN=Home Care Assistant Local Test Root/O=HCA Local Test","-addext","basicConstraints=critical,CA:TRUE,pathlen:0","-addext","keyUsage=critical,keyCertSign,cRLSign"]);
}
for(const [name,cn,eku]of [["signer","Home Care Assistant Technical Test Signer","1.3.6.1.5.5.7.3.36"],["tsa","Home Care Assistant Internal Test TSA","critical,timeStamping"]]){
 if(existsSync(key(name+".crt")))continue;
 run(["req","-new","-newkey","rsa:3072","-passout",passArg,"-keyout",key(name+".key"),"-out",key(name+".csr"),"-subj","/CN="+cn+"/O=HCA Local Test"]);
 writeFileSync(key(name+".ext"),`basicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature,nonRepudiation\nextendedKeyUsage=${eku}\nsubjectKeyIdentifier=hash\nauthorityKeyIdentifier=keyid,issuer\n`);
 run(["x509","-req","-in",key(name+".csr"),"-CA",key("root.crt"),"-CAkey",key("root.key"),"-passin",passArg,"-CAcreateserial","-out",key(name+".crt"),"-days","365","-sha256","-extfile",key(name+".ext")]);
}
// OpenSSL reads distinct password lines when both options name the same file.
const exportPass=key("passphrase-export");writeFileSync(exportPass,readFileSync(passFile));
if(!existsSync(key("signer.p12")))run(["pkcs12","-export","-in",key("signer.crt"),"-inkey",key("signer.key"),"-passin",passArg,"-certfile",key("root.crt"),"-out",key("signer.p12"),"-passout","file:"+exportPass]);
if(!existsSync(key("tsa.serial")))writeFileSync(key("tsa.serial"),"01\n");
const quoted=name=>key(name).replaceAll("\\","/");
writeFileSync(key("tsa.cnf"),`[tsa]\ndefault_tsa=tsa_config\n[tsa_config]\nserial=${quoted("tsa.serial")}\nsigner_cert=${quoted("tsa.crt")}\ncerts=${quoted("root.crt")}\nsigner_key=${quoted("tsa.key")}\nsigner_digest=sha256\ndefault_policy=1.3.6.1.4.1.53594.1.1\ndigests=sha256,sha384,sha512\naccuracy=secs:1\nordering=no\ntsa_name=yes\ness_cert_id_chain=yes\ness_cert_id_alg=sha256\n`);
const timestampAuthority={async timestamp(digest,algorithm){
 if(algorithm!=="SHA-256")throw new Error("Probe only permits SHA-256");
 run(["ts","-query","-digest",Buffer.from(digest).toString("hex"),"-sha256","-cert","-out",file("request.tsq")]);
 run(["ts","-reply","-config",key("tsa.cnf"),"-passin",passArg,"-queryfile",file("request.tsq"),"-out",file("response.tsr")]);
 run(["ts","-verify","-queryfile",file("request.tsq"),"-in",file("response.tsr"),"-CAfile",key("root.crt"),"-untrusted",key("tsa.crt")]);
 run(["ts","-reply","-in",file("response.tsr"),"-token_out","-out",file("token.tst")]);return readFileSync(file("token.tst"));
}};
const unsigned=await PDFDocument.create(),page=unsigned.addPage(),font=await unsigned.embedFont(StandardFonts.Helvetica);
page.drawText("Home Care Assistant - isolated signature interoperability probe",{x:40,y:770,size:12,font});
page.drawText("Technical system signature; internal timestamp; no personal signature.",{x:40,y:740,size:11,font});
const signer=await P12Signer.create(readFileSync(key("signer.p12")),readFileSync(passFile,"utf8"));
const source=await PDF.load(await unsigned.save()),signed=await source.sign({signer,level:"B-T",timestampAuthority,reason:"Isolated technical validation"});
writeFileSync(file("signed-proof.pdf"),signed.bytes);
writeFileSync(file("appended-proof.pdf"),Buffer.concat([signed.bytes,Buffer.from("\n% alteration after signature\n")]));
const altered=Buffer.from(signed.bytes);altered[7]=altered[7]===55?54:55;writeFileSync(file("tampered-proof.pdf"),altered);
const summary={library:"@libpdf/core@0.5.3",purpose:"ISOLATED_PROBE_NOT_PRODUCT",profileRequested:"B-T",tsa:"internal OpenSSL RFC3161 adapter; not serverless implementation",timestampResponseVerifiedByOpenSSL:true,sha256:createHash("sha256").update(signed.bytes).digest("hex"),bytes:signed.bytes.length,warnings:signed.warnings};
writeFileSync(file("signing-proof.json"),JSON.stringify(summary,null,2)+"\n");console.log(JSON.stringify(summary));
