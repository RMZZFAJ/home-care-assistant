import json,sys,os
from pathlib import Path
from asn1crypto import pem,x509
from pyhanko.pdf_utils.reader import PdfFileReader
from pyhanko.sign.validation import validate_pdf_signature
from pyhanko_certvalidator import ValidationContext
root=Path(sys.argv[2]) if len(sys.argv)>2 else Path(os.environ['LOCALAPPDATA'])/'home-care-assistant'/'signature-poc'/'root.crt'
cert=x509.Certificate.load(pem.unarmor(root.read_bytes())[2])
context=ValidationContext(trust_roots=[cert],allow_fetching=False,revocation_mode='soft-fail')
with open(sys.argv[1],'rb') as stream:
 reader=PdfFileReader(stream,strict=True)
 assert len(reader.embedded_signatures)==1
 signature=reader.embedded_signatures[0]
 result=validate_pdf_signature(signature,signer_validation_context=context,ts_validation_context=context)
 stamp=result.timestamp_validity
 signed_attrs={a['type'].native for a in signature.signer_info['signed_attrs']}
 unsigned_attrs={a['type'].native for a in signature.signer_info['unsigned_attrs']}
 proof={'independentVerifier':'pyHanko0.38.1','integrity':result.intact,'signatureValid':result.valid,'trustedByExplicitInternalRoot':result.trusted,'coverage':result.coverage.name,'subFilter':str(signature.sig_object['/SubFilter']),'timestampPresent':stamp is not None,'timestampIntegrity':bool(stamp and stamp.intact),'timestampSignatureValid':bool(stamp and stamp.valid),'timestampTrustedByInternalRoot':bool(stamp and stamp.trusted),'timeIndependentFromSystem':False,'externalTrust':False}
 proof['padesSignedAttributes']=sorted(signed_attrs)
 proof['padesUnsignedAttributes']=sorted(unsigned_attrs)
 proof['accepted']=all([proof['integrity'],proof['signatureValid'],proof['trustedByExplicitInternalRoot'],proof['coverage']=='ENTIRE_FILE',proof['subFilter']=='/ETSI.CAdES.detached',proof['timestampIntegrity'],proof['timestampSignatureValid'],proof['timestampTrustedByInternalRoot'],'signing_certificate_v2' in signed_attrs,'signing_time' not in signed_attrs,'signature_time_stamp_token' in unsigned_attrs])
 print(json.dumps(proof));sys.exit(0 if proof['accepted'] else 1)
