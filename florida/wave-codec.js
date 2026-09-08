const RGBA_CHANNELS=4;

function validateRows(data,rowBytes){
  if(!(data instanceof Uint8Array))throw new TypeError('Wave data must be a Uint8Array.');
  if(!Number.isInteger(rowBytes)||rowBytes<RGBA_CHANNELS||rowBytes%RGBA_CHANNELS||data.length%rowBytes)throw new RangeError('Wave rows must contain complete RGBA pixels.');
}

/** Restore RGBA Sub prediction in place; the first pixel resets every row. */
export function decodeSubRows(data,rowBytes){
  validateRows(data,rowBytes);
  for(let row=0;row<data.length;row+=rowBytes){
    for(let i=row+RGBA_CHANNELS;i<row+rowBytes;i++)data[i]=(data[i]+data[i-RGBA_CHANNELS])&255;
  }
  return data;
}

/** Apply lossless RGBA Sub prediction in place, walking backwards per row. */
export function encodeSubRows(data,rowBytes){
  validateRows(data,rowBytes);
  for(let row=0;row<data.length;row+=rowBytes){
    for(let i=row+rowBytes-1;i>=row+RGBA_CHANNELS;i--)data[i]=(data[i]-data[i-RGBA_CHANNELS]+256)&255;
  }
  return data;
}
