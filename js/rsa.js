
/* RSA public key encryption/decryption
 * The following functions are (c) 2000 by John M Hanna and are
 * released under the terms of the Gnu Public License.
 * You must freely redistribute them with their source -- see the
 * GPL for details.
 *  -- Latest version found at http://sourceforge.net/projects/shop-js
 *
 * Modifications and GnuPG multi precision integer (mpi) conversion added
 * 2004 by Herbert Hanewinkel, www.haneWIN.de
 */

// --- Arbitrary Precision Math ---
// badd(a,b), bsub(a,b), bsqr(a), bmul(a,b)
// bdiv(a,b), bmod(a,b), bexpmod(g,e,m), bmodexp(g,e,m)

// bs is the shift, bm is the mask
// set single precision bits to 28
var bs=28;
var bx2=1<<bs, bm=bx2-1, bx=bx2>>1, bd=bs>>1, bdm=(1<<bd)-1;

var log2=Math.log(2);

function zeros(n)
{
 var r=new Array(n);

 while(n-->0) r[n]=0;
 return r;
}

function zclip(r)
{
 var n = r.length;
 if(r[n-1]) return r;
 while(n>1 && r[n-1]==0) n--;
 return r.slice(0,n);
}

// returns bit length of integer x
function nbits(x)
{
  var n = 1, t;
  if((t=x>>>16) != 0) { x = t; n += 16; }
  if((t=x>>8) != 0) { x = t; n += 8; }
  if((t=x>>4) != 0) { x = t; n += 4; }
  if((t=x>>2) != 0) { x = t; n += 2; }
  if((t=x>>1) != 0) { x = t; n += 1; }
  return n;
}

function badd(a,b)
{
 var al=a.length;
 var bl=b.length;

 if(al < bl) return badd(b,a);

 var r=new Array(al);
 var c=0, n=0;

 for(; n<bl; n++)
 {
  c+=a[n]+b[n];
  r[n]=c & bm;
  c>>>=bs;
 }
 for(; n<al; n++)
 {
  c+=a[n];
  r[n]=c & bm;
  c>>>=bs;
 }
 if(c) r[n]=c;
 return r;
}

function bsub(a,b)
{
 var al=a.length;
 var bl=b.length;

 if(bl > al) return [];
 if(bl == al)
 {
  if(b[bl-1] > a[bl-1]) return [];
  if(bl==1) return [a[0]-b[0]];
 }

 var r=new Array(al);
 var c=0;

 for(var n=0; n<bl; n++)
 {
  c+=a[n]-b[n];
  r[n]=c & bm;
  c>>=bs;
 }
 for(;n<al; n++)
 {
  c+=a[n];
  r[n]=c & bm;
  c>>=bs;
 }
 if(c) return [];

 return zclip(r);
}

function ip(w, n, x, y, c)
{
 var xl = x&bdm;
 var xh = x>>bd;

 var yl = y&bdm;
 var yh = y>>bd;

 var m = xh*yl+yh*xl;
 var l = xl*yl+((m&bdm)<<bd)+w[n]+c;
 w[n] = l&bm;
 c = xh*yh+(m>>bd)+(l>>bs);
 return c;
}

// Multiple-precision squaring, HAC Algorithm 14.16

function bsqr(x)
{
 var t = x.length;
 var n = 2*t;
 var r = zeros(n);
 var c = 0;
 var i, j;

 for(i = 0; i < t; i++)
 {
  c = ip(r,2*i,x[i],x[i],0);
  for(j = i+1; j < t; j++)
  {
   c = ip(r,i+j,2*x[j],x[i],c);
  }
  r[i+t] = c;
 }

 return zclip(r);
}

// Multiple-precision multiplication, HAC Algorithm 14.12

function bmul(x,y)
{
 var n = x.length;
 var t = y.length;
 var r = zeros(n+t-1);
 var c, i, j;

 for(i = 0; i < t; i++)
 {
  c = 0;
  for(j = 0; j < n; j++)
  {
   c = ip(r,i+j,x[j],y[i],c);
  }
  r[i+n] = c;
 }

 return zclip(r);
}

function toppart(x,start,len)
{
 var n=0;
 while(start >= 0 && len-->0) n=n*bx2+x[start--];
 return n;
}

// Multiple-precision division, HAC Algorithm 14.20

function bdiv(a,b)
{
 var n=a.length-1;
 var t=b.length-1;
 var nmt=n-t;

 // trivial cases; a < b
 if(n < t || n==t && (a[n]<b[n] || n>0 && a[n]==b[n] && a[n-1]<b[n-1]))
 {
  this.q=[0]; this.mod=a;
  return this;
 }

 // trivial cases; q < 4
 if(n==t && toppart(a,t,2)/toppart(b,t,2) <4)
 {
  var x=a.concat();
  var qq=0;
  var xx;
  for(;;)
  {
   xx=bsub(x,b);
   if(xx.length==0) break;
   x=xx; qq++;
  }
  this.q=[qq]; this.mod=x;
  return this;
 }

 // normalize
 var shift2=Math.floor(Math.log(b[t])/log2)+1;
 var shift=bs-shift2;

 var x=a.concat();
 var y=b.concat();

 if(shift)
 {
  for(i=t; i>0; i--) y[i]=((y[i]<<shift) & bm) | (y[i-1] >> shift2);
  y[0]=(y[0]<<shift) & bm;
  if(x[n] & ((bm <<shift2) & bm))
  {
   x[++n]=0; nmt++;
  }
  for(i=n; i>0; i--) x[i]=((x[i]<<shift) & bm) | (x[i-1] >> shift2);
  x[0]=(x[0]<<shift) & bm;
 }

 var i, j, x2;
 var q=zeros(nmt+1);
 var y2=zeros(nmt).concat(y);
 for(;;)
 {
  x2=bsub(x,y2);
  if(x2.length==0) break;
  q[nmt]++;
  x=x2;
 }

 var yt=y[t], top=toppart(y,t,2)
 for(i=n; i>t; i--)
 {
  var m=i-t-1;
  if(i >= x.length) q[m]=1;
  else if(x[i] == yt) q[m]=bm;
  else q[m]=Math.floor(toppart(x,i,2)/yt);

  var topx=toppart(x,i,3);
  while(q[m] * top > topx) q[m]--;

  //x-=q[m]*y*b^m
  y2=y2.slice(1);
  x2=bsub(x,bmul([q[m]],y2));
  if(x2.length==0)
  {
   q[m]--;
   x2=bsub(x,bmul([q[m]],y2));
  }
  x=x2;
 }
 // de-normalize
 if(shift)
 {
  for(i=0; i<x.length-1; i++) x[i]=(x[i]>>shift) | ((x[i+1] << shift2) & bm);
  x[x.length-1]>>=shift;
 }

 this.q = zclip(q);
 this.mod = zclip(x);
 return this;
}

function simplemod(i,m) // returns the mod where m < 2^bd
{
 var c=0, v;
 for(var n=i.length-1; n>=0; n--)
 {
  v=i[n];
  c=((v >> bd) + (c<<bd)) % m;
  c=((v & bdm) + (c<<bd)) % m;
 }
 return c;
}

function bmod(p,m)
{
 if(m.length==1)
 {
  if(p.length==1) return [p[0] % m[0]];
  if(m[0] < bdm) return [simplemod(p,m[0])];
 }

 var r=bdiv(p,m);
 return r.mod;
}

// Barrett's modular reduction, HAC Algorithm 14.42

function bmod2(x,m,mu)
{
 var xl=x.length - (m.length << 1);
 if(xl > 0) return bmod2(x.slice(0,xl).concat(bmod2(x.slice(xl),m,mu)),m,mu);

 var ml1=m.length+1, ml2=m.length-1,rr;
 //var q1=x.slice(ml2)
 //var q2=bmul(q1,mu)
 var q3=bmul(x.slice(ml2),mu).slice(ml1);
 var r1=x.slice(0,ml1);
 var r2=bmul(q3,m).slice(0,ml1);
 var r=bsub(r1,r2);
 
 if(r.length==0)
 {
  r1[ml1]=1;
  r=bsub(r1,r2);
 }
 for(var n=0;;n++)
 {
  rr=bsub(r,m);
  if(rr.length==0) break;
  r=rr;
  if(n>=3) return bmod2(r,m,mu);
 }
 return r;
}

// Modular exponentiation, HAC Algorithm 14.79

function bexpmod(g,e,m)
{
 var a = g.concat();
 var l = e.length-1;
 var n = nbits(e[l])-2;

 for(; l >= 0; l--)
 {
  for(; n >= 0; n-=1)
  {
   a=bmod(bsqr(a),m);
   if(e[l] & (1<<n)) a=bmod(bmul(a,g),m);
  }
  n = bs-1;
 }
 return a;
}

// Modular exponentiation using Barrett reduction

function bmodexp(g,e,m)
{
 var a=g.concat();
 var l=e.length-1;
 var n=m.length*2;
 var mu=zeros(n+1);
 mu[n]=1;
 mu=bdiv(mu,m).q;

 n = nbits(e[l])-2;

 for(; l >= 0; l--)
 {
  for(; n >= 0; n-=1)
  {
   a=bmod2(bsqr(a),m, mu);
   if(e[l] & (1<<n)) a=bmod2(bmul(a,g),m, mu);
  }
  n = bs-1;
 }
 return a;
}

// -----------------------------------------------------
// Compute s**e mod m for RSA public key operation

function RSAencrypt(s, e, m) { return bexpmod(s,e,m); }

// Compute m**d mod p*q for RSA private key operations.

function RSAdecrypt(m, d, p, q, u)
{
 var xp = bmodexp(bmod(m,p), bmod(d,bsub(p,[1])), p);
 var xq = bmodexp(bmod(m,q), bmod(d,bsub(q,[1])), q);

 var t=bsub(xq,xp);
 if(t.length==0)
 {
  t=bsub(xp,xq);
  t=bmod(bmul(t, u), q);
  t=bsub(q,t);
 }
 else
 {
  t=bmod(bmul(t, u), q);
 } 
 return badd(bmul(t,p), xp);
}

// -----------------------------------------------------------------
// conversion functions: num array <-> multi precision integer (mpi)
// mpi: 2 octets with length in bits + octets in big endian order

function mpi2b(s)
{
 var bn=1, r=[0], rn=0, sb=256;
 var c, sn=s.length;
 if(sn < 2) return 0;

 var len=(sn-2)*8;
 var bits=s.charCodeAt(0)*256+s.charCodeAt(1);
 if(bits > len || bits < len-8) return 0;

 for(var n=0; n<len; n++)
 {
  if((sb<<=1) > 255)
  {
   sb=1; c=s.charCodeAt(--sn);
  }
  if(bn > bm)
  {
   bn=1;
   r[++rn]=0;
  }
  if(c & sb) r[rn]|=bn;
  bn<<=1;
 }
 return r;
}

function b2mpi(b)
{
 var bn=1, bc=0, r=[0], rb=1, rn=0;
 var bits=b.length*bs;
 var n, rr='';

 for(n=0; n<bits; n++)
 {
  if(b[bc] & bn) r[rn]|=rb;
  if((rb<<=1) > 255)
  {
   rb=1; r[++rn]=0;
  }
  if((bn<<=1) > bm)
  {
   bn=1; bc++;
  }
 }

 while(rn && r[rn]==0) rn--;

 bn=256;
 for(bits=8; bits>0; bits--) if(r[rn] & (bn>>=1)) break;
 bits+=rn*8;

 rr+=String.fromCharCode(bits/256)+String.fromCharCode(bits%256);
 if(bits) for(n=rn; n>=0; n--) rr+=String.fromCharCode(r[n]);
 return rr;
}

