declare module 'adm-zip' {
  export default class AdmZip {
    addFile(entryName: string, content: Buffer): void;
    toBuffer(): Buffer;
  }
}
