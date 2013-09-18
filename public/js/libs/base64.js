///
///
// This file implements base64 encoding and decoding.
// Encoding is done by the function base64Encode(), decoding
// by base64Decode(). The naming mimics closely the corresponding
// library functions found in PHP. However, this implementation allows
// for a more flexible use.
//
// This implementation follows RFC 3548 (http://www.faqs.org/rfcs/rfc3548.node),
// so the copyright formulated therein applies.
//
// Dr.Heller Information Management, 2005 (http://www.hellerim.de).
//
var base64=function(){};base64.classID=function(){return"system.utility.base64"};base64.isFinal=function(){return!0};base64.encString="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";base64.encStringS="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
base64.encode=function(d,f,l){if(1>arguments.length)return null;var k=[];if(3<=arguments.length&&!0!=l&&!1!=l)return null;var e=3<=arguments.length&&l?this.encStringS:this.encString,m="string"==typeof d;if(!m&&"object"!=typeof d&&!(d instanceof Array))return null;2>arguments.length&&(f=!0);if(!0!=f&&!1!=f)return null;for(var a=!m||!f?1:2,b=[],c=0,g=1,h=0,j=c=0;j<d.length;j++){for(var c=m?d.charCodeAt(j):d[j],i=a-1;0<=i;i--)k[i]=c&255,c>>=8;for(i=0;i<a;i++)h=h<<8&65280|k[i],c=63<<2*g&h,h-=c,b.push(e.charAt(c>>
2*g)),g++,4==g&&(b.push(e.charAt(h&63)),g=1)}switch(g){case 2:b.push(e.charAt(63&16*h));b.push("==");break;case 3:b.push(e.charAt(63&4*h)),b.push("=")}return b.join("")};
base64.decode=function(d,f,l,k){if(1>arguments.length)return null;2>arguments.length&&(f=0);if(0!=f&&1!=f&&2!=f||3<=arguments.length&&!0!=l&&!1!=l)return null;var e=3<=arguments.length&&l?this.encStringS:this.encString;if(4<=arguments.length&&!0!=k&&!1!=k)return null;for(var m={},a=0;a<e.length;a++)m[e.charAt(a)]=a;var e=0==f?[]:"",k=4==arguments.length&&k,b=0,c=a=0,g=0,h=0,j=d.length;if(k){for(var i="",n=!1,p=0,a=1;a<=d.length;a++)g=d.charAt(j-a),"="==g?n||1<++p&&(n=!0):void 0!=m[g]&&(n||(n=!0),
i=g+i);for(a=0;a<=p;a++){if(2==a)return null;if(0==(i.length+p)%4)break}if(1==i.length%4)return null;d=i;j=d.length}else{if(0<d.length%4)return null;for(a=0;2>a;a++)if("="==d.charAt(j-1))j--;else break}for(a=0;a<j;a++){b<<=6;if(void 0==(g=m[d.charAt(a)]))return null;b|=g&63;0==c?c++:(2==f?(1==h&&(e+=String.fromCharCode(b>>2*(3-c)),b&=~(65535<<2*(3-c))),h=++h%2):(0==f?e.push(b>>2*(3-c)):e+=String.fromCharCode(b>>2*(3-c)),b&=~(255<<2*(3-c))),c=++c%4)}return 2==f&&1==h?null:e};