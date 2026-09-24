import{createCipheriv,createDecipheriv,randomBytes}from'node:crypto';

function getKey(){
 const raw=process.env.PAIRVOICE_CREDENTIAL_ENCRYPTION_KEY;
 if(!raw)throw new Error('PAIRVOICE_CREDENTIAL_ENCRYPTION_KEY is not configured');
 const key=Buffer.from(raw,'base64');
 if(key.length!==32)throw new Error('PAIRVOICE_CREDENTIAL_ENCRYPTION_KEY must be 32 bytes encoded as base64');
 return key;
}

export function encryptSecret(value:string){
 if(!value)throw new Error('Secret is required');
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',getKey(),iv);
 const encrypted=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);
 const tag=cipher.getAuthTag();
 return ['v1',iv.toString('base64'),tag.toString('base64'),encrypted.toString('base64')].join(':');
}

export function decryptSecret(value:string){
 const [version,ivB64,tagB64,dataB64]=value.split(':');
 if(version!=='v1'||!ivB64||!tagB64||!dataB64)throw new Error('Unsupported credential ciphertext');
 const decipher=createDecipheriv('aes-256-gcm',getKey(),Buffer.from(ivB64,'base64'));
 decipher.setAuthTag(Buffer.from(tagB64,'base64'));
 return Buffer.concat([decipher.update(Buffer.from(dataB64,'base64')),decipher.final()]).toString('utf8');
}
