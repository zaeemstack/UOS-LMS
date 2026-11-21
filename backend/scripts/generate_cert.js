import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const certDir = path.resolve(__dirname, '../certs');
if (!fs.existsSync(certDir)) {
  fs.mkdirSync(certDir, { recursive: true });
}

const cnfContent = `[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no

[req_distinguished_name]
C = PK
ST = Punjab
L = Sahiwal
O = University of Sahiwal
OU = IT Department
CN = 172.200.32.10.sslip.io

[v3_req]
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = 172.200.32.10.sslip.io
DNS.2 = *.172.200.32.10.sslip.io
DNS.3 = localhost
IP.1 = 172.200.32.10
IP.2 = 127.0.0.1
`;

const cnfPath = path.join(certDir, 'openssl.cnf');
const keyPath = path.join(certDir, 'server.key');
const crtPath = path.join(certDir, 'server.crt');

fs.writeFileSync(cnfPath, cnfContent, 'utf8');

const opensslPath = 'd:\\xampp\\apache\\bin\\openssl.exe';
const cmd = `"${opensslPath}" req -x509 -nodes -days 3650 -newkey rsa:2048 -keyout "${keyPath}" -out "${crtPath}" -config "${cnfPath}"`;

console.log('Running:', cmd);
execSync(cmd, { stdio: 'inherit' });

console.log('SSL Certificate generated successfully:');
console.log('Key:', keyPath, fs.statSync(keyPath).size, 'bytes');
console.log('Cert:', crtPath, fs.statSync(crtPath).size, 'bytes');
