/**
 * @file gif.worker.js
 * @description Web worker para la librería gif.js. Procesa la codificación de GIF en un hilo separado.
 * Este es un script de terceros y no debe ser modificado.
 * @version 0.2.0
 * @see https://github.com/jnordberg/gif.js
 */
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var NeuQuant = require('./TypedNeuQuant');
var LZWEncoder = require('./LZWEncoder');

function GIFEncoder(width, height) {
  this.width = width;
  this.height = height;
  this.pixels = null;
  this.indexedPixels = null;
  this.colorDepth = 0;
  this.colorTab = null;
  this.usedEntry = new Array();
  this.palSize = 7;
  this.dispose = -1;
  this.firstFrame = true;
  this.sample = 10;
  this.out = new ByteArray();
}

GIFEncoder.prototype.setDelay = function (ms) {
  this.delay = Math.round(ms / 10);
};

GIFEncoder.prototype.setDispose = function (code) {
  if (code >= 0) {
    this.dispose = code;
  }
};

GIFEncoder.prototype.setFrameRate = function (fps) {
  this.delay = Math.round(100 / fps);
};

GIFEncoder.prototype.setQuality = function (quality) {
  if (quality < 1) quality = 1;
  this.sample = quality;
};

GIFEncoder.prototype.setRepeat = function (repeat) {
  this.repeat = repeat;
};

GIFEncoder.prototype.addFrame = function (pixels) {
  this.pixels = pixels;
  this.getImagePixels();
  this.analyzePixels();
  if (this.firstFrame) {
    this.writeLSD();
    this.writePalette();
    if (this.repeat >= 0) {
      this.writeNetscapeExt();
    }
  }
  this.writeGraphicCtrlExt();
  this.writeImageDesc();
  if (!this.firstFrame) {
    this.writePalette();
  }
  this.writePixels();
  this.firstFrame = false;
};

GIFEncoder.prototype.finish = function () {
  this.out.writeByte(0x3b);
  return this.out.getData();
};

GIFEncoder.prototype.analyzePixels = function () {
  var len = this.pixels.length;
  var nPix = len / 3;
  this.indexedPixels = new Uint8Array(nPix);
  var nq = new NeuQuant(this.pixels, this.sample);
  this.colorTab = nq.process();
  var k = 0;
  for (var j = 0; j < nPix; j++) {
    var index = nq.map(this.pixels[k++] & 0xff, this.pixels[k++] & 0xff, this.pixels[k++] & 0xff);
    this.usedEntry[index] = true;
    this.indexedPixels[j] = index;
  }
  this.pixels = null;
  this.colorDepth = 8;
  this.palSize = 7;
};

GIFEncoder.prototype.getImagePixels = function () {
  var w = this.width;
  var h = this.height;
  var imagePixels = new Uint8Array(w * h * 3);
  var data = this.pixels;
  var srcPos = 0;
  var dstPos = 0;
  for (var i = 0; i < h; i++) {
    for (var j = 0; j < w; j++) {
      imagePixels[dstPos++] = data[srcPos++];
      imagePixels[dstPos++] = data[srcPos++];
      imagePixels[dstPos++] = data[srcPos++];
      srcPos++;
    }
  }
  this.pixels = imagePixels;
};

GIFEncoder.prototype.writeGraphicCtrlExt = function () {
  this.out.writeByte(0x21);
  this.out.writeByte(0xf9);
  this.out.writeByte(4);
  var transp, disp;
  disp = this.dispose & 7;
  transp = 0;
  this.out.writeByte(0 | disp << 2 | transp);
  this.out.writeShort(this.delay);
  this.out.writeByte(0);
  this.out.writeByte(0);
};

GIFEncoder.prototype.writeImageDesc = function () {
  this.out.writeByte(0x2c);
  this.out.writeShort(0);
  this.out.writeShort(0);
  this.out.writeShort(this.width);
  this.out.writeShort(this.height);
  if (this.firstFrame) {
    this.out.writeByte(0);
  } else {
    this.out.writeByte(0x80 | this.palSize);
  }
};

GIFEncoder.prototype.writeLSD = function () {
  this.out.writeString('GIF89a');
  this.out.writeShort(this.width);
  this.out.writeShort(this.height);
  this.out.writeByte(0x80 | this.palSize);
  this.out.writeByte(0);
  this.out.writeByte(0);
};

GIFEncoder.prototype.writeNetscapeExt = function () {
  this.out.writeByte(0x21);
  this.out.writeByte(0xff);
  this.out.writeByte(11);
  this.out.writeString('NETSCAPE2.0');
  this.out.writeByte(3);
  this.out.writeByte(1);
  this.out.writeShort(this.repeat);
  this.out.writeByte(0);
};

GIFEncoder.prototype.writePalette = function () {
  this.out.writeBytes(this.colorTab);
  var n = (1 << this.colorDepth) - this.colorTab.length / 3;
  for (var i = 0; i < n; i++) {
    this.out.writeByte(0);
    this.out.writeByte(0);
    this.out.writeByte(0);
  }
};

GIFEncoder.prototype.writePixels = function () {
  var enc = new LZWEncoder(this.width, this.height, this.indexedPixels, this.colorDepth);
  enc.encode(this.out);
};

function ByteArray() {
  this.page = -1;
  this.pages = [];
  this.newPage();
}

ByteArray.pageSize = 4096;
ByteArray.charMap = {};
for (var i = 0; i < 256; i++) {
  ByteArray.charMap[i] = String.fromCharCode(i);
}

ByteArray.prototype.newPage = function () {
  this.pages[++this.page] = new Uint8Array(ByteArray.pageSize);
  this.cursor = 0;
};

ByteArray.prototype.getData = function () {
  var rv = '';
  for (var p = 0; p < this.pages.length; p++) {
    for (var i = 0; i < ByteArray.pageSize; i++) {
      rv += ByteArray.charMap[this.pages[p][i]];
    }
  }
  return rv;
};

ByteArray.prototype.writeByte = function (val) {
  if (this.cursor >= ByteArray.pageSize) {
    this.newPage();
  }
  this.pages[this.page][this.cursor++] = val;
};

ByteArray.prototype.writeShort = function (val) {
  this.writeByte(val & 0xff);
  this.writeByte(val >> 8 & 0xff);
};

ByteArray.prototype.writeString = function (s) {
  for (var i = 0; i < s.length; i++) {
    this.writeByte(s.charCodeAt(i));
  }
};

ByteArray.prototype.writeBytes = function (array, offset, length) {
  for (var l = length || array.length, i = offset || 0; i < l; i++) {
    this.writeByte(array[i]);
  }
};

module.exports = GIFEncoder;

},{"./LZWEncoder":2,"./TypedNeuQuant":3}],2:[function(require,module,exports){
'use strict';

var EOF = -1;
var BITS = 12;
var HSIZE = 5003;
var masks = [0x0000, 0x0001, 0x0003, 0x0007, 0x000F, 0x001F, 0x003F, 0x007F, 0x00FF, 0x01FF, 0x03FF, 0x07FF, 0x0FFF, 0x1FFF, 0x3FFF, 0x7FFF];

function LZWEncoder(width, height, pixels, colorDepth) {
  this.width = width;
  this.height = height;
  this.pixels = pixels;
  this.colorDepth = colorDepth;
  this.initCodeSize = 0;
  this.accum = new Uint8Array(256);
  this.htab = new Int32Array(HSIZE);
  this.codetab = new Int32Array(HSIZE);
  this.cur_accum = 0;
  this.cur_bits = 0;
  this.a_count = 0;
  this.free_ent = 0;
  this.maxcode = 0;
  this.clear_flg = false;
  this.g_init_bits = 0;
  this.ClearCode = 0;
  this.EOFCode = 0;
}

LZWEncoder.prototype.encode = function (outs) {
  outs.writeByte(this.colorDepth);
  this.g_init_bits = this.colorDepth + 1;
  this.clear_flg = false;
  this.n_bits = this.g_init_bits;
  this.maxcode = this.MAXCODE(this.n_bits);

  this.ClearCode = 1 << (this.colorDepth);
  this.EOFCode = this.ClearCode + 1;
  this.free_ent = this.ClearCode + 2;
  this.a_count = 0;
  var ent = this.nextPixel();
  var hshift = 0;
  for (var fcode = HSIZE; fcode < 65536; fcode *= 2) {
    ++hshift;
  }
  hshift = 8 - hshift;
  var hsize_reg = HSIZE;
  this.cl_hash(hsize_reg);

  this.output(this.ClearCode, outs);

  var c;
  while ((c = this.nextPixel()) != EOF) {
    var fcode = (c << BITS) + ent;
    var i = c << hshift ^ ent;
    if (this.htab[i] === fcode) {
      ent = this.codetab[i];
      continue;
    } else if (this.htab[i] >= 0) {
      var disp = hsize_reg - i;
      if (i === 0) {
        disp = 1;
      }
      do {
        if ((i -= disp) < 0) {
          i += hsize_reg;
        }
        if (this.htab[i] === fcode) {
          ent = this.codetab[i];
          continue;
        }
      } while (this.htab[i] >= 0);
    }
    this.output(ent, outs);
    ent = c;
    if (this.free_ent < 1 << BITS) {
      this.codetab[i] = this.free_ent++;
      this.htab[i] = fcode;
    } else {
      this.cl_block(outs);
    }
  }

  this.output(ent, outs);
  this.output(this.EOFCode, outs);
};

LZWEncoder.prototype.MAXCODE = function (n_bits) {
  return (1 << n_bits) - 1;
};

LZWEncoder.prototype.nextPixel = function () {
  if (this.pixels.length === 0) return EOF;
  this.img_pos++;
  return this.pixels[this.img_pos] & 0xff;
};

LZWEncoder.prototype.cl_block = function (outs) {
  this.cl_hash(HSIZE);
  this.free_ent = this.ClearCode + 2;
  this.clear_flg = true;
  this.output(this.ClearCode, outs);
};

LZWEncoder.prototype.cl_hash = function (hsize) {
  for (var i = 0; i < hsize; ++i) {
    this.htab[i] = -1;
  }
};

LZWEncoder.prototype.output = function (code, outs) {
  this.cur_accum &= masks[this.cur_bits];
  if (this.cur_bits > 0) {
    this.cur_accum |= code << this.cur_bits;
  } else {
    this.cur_accum = code;
  }
  this.cur_bits += this.n_bits;
  while (this.cur_bits >= 8) {
    this.char_out(this.cur_accum & 0xff, outs);
    this.cur_accum >>= 8;
    this.cur_bits -= 8;
  }
  if (this.free_ent > this.maxcode || this.clear_flg) {
    if (this.clear_flg) {
      this.n_bits = this.g_init_bits;
      this.maxcode = this.MAXCODE(this.n_bits);
      this.clear_flg = false;
    } else {
      ++this.n_bits;
      if (this.n_bits == BITS) {
        this.maxcode = 1 << BITS;
      } else {
        this.maxcode = this.MAXCODE(this.n_bits);
      }
    }
  }
  if (code == this.EOFCode) {
    while (this.cur_bits > 0) {
      this.char_out(this.cur_accum & 0xff, outs);
      this.cur_accum >>= 8;
      this.cur_bits -= 8;
    }
    this.flush_char(outs);
  }
};

LZWEncoder.prototype.char_out = function (c, outs) {
  this.accum[this.a_count++] = c;
  if (this.a_count >= 254) {
    this.flush_char(outs);
  }
};

LZWEncoder.prototype.flush_char = function (outs) {
  if (this.a_count > 0) {
    outs.writeByte(this.a_count);
    outs.writeBytes(this.accum, 0, this.a_count);
    this.a_count = 0;
  }
};

module.exports = LZWEncoder;

},{}],3:[function(require,module,exports){
'use strict';

var ncycles = 100;
var netsize = 256;
var maxnetpos = netsize - 1;
var netbiasshift = 4;
var intbiasshift = 16;
var intbias = 1 << intbiasshift;
var gammashift = 10;
var gamma = 1 << gammashift;
var betashift = 10;
var beta = intbias >> betashift;
var betagamma = intbias << gammashift - betashift;
var initrad = netsize >> 3;
var radiusbiasshift = 6;
var radiusbias = 1 << radiusbiasshift;
var initradius = initrad * radiusbias;
var radiusdec = 30;
var alphabiasshift = 10;
var initalpha = 1 << alphabiasshift;
var alphadec;
var radbiasshift = 8;
var radbias = 1 << radbiasshift;
var alpharadbshift = alphabiasshift + radbiasshift;
var alpharadbias = 1 << alpharadbshift;

function NeuQuant(pixels, samplefac) {
  this.pixels = pixels;
  this.samplefac = samplefac;
  this.network = new Array(netsize);
  for (var i = 0; i < netsize; i++) {
    this.network[i] = new Array(4);
    this.network[i][0] = this.network[i][1] = this.network[i][2] = (i << netbiasshift + 8) / netsize;
    this.network[i][3] = 0;
  }
  this.netindex = new Int32Array(256);
  this.bias = new Int32Array(netsize);
  this.freq = new Int32Array(netsize);
  this.radpower = new Int32Array(netsize >> 3);
}

NeuQuant.prototype.setUpParams = function () {
  this.pixels = this.pixels;
  this.samplefac = this.samplefac;
  this.network = this.network;
  this.netindex = this.netindex;
  this.bias = this.bias;
  this.freq = this.freq;
  this.radpower = this.radpower;
};

NeuQuant.prototype.unbiasnet = function () {
  for (var i = 0; i < netsize; i++) {
    this.network[i][0] >>= netbiasshift;
    this.network[i][1] >>= netbiasshift;
    this.network[i][2] >>= netbiasshift;
    this.network[i][3] = i;
  }
};

NeuQuant.prototype.altersingle = function (alpha, i, b, g, r) {
  this.network[i][0] -= alpha * (this.network[i][0] - b) / initalpha;
  this.network[i][1] -= alpha * (this.network[i][1] - g) / initalpha;
  this.network[i][2] -= alpha * (this.network[i][2] - r) / initalpha;
};

NeuQuant.prototype.alterneigh = function (radius, i, b, g, r) {
  var lo = Math.abs(i - radius);
  var hi = Math.min(i + radius, netsize);
  var j = i + 1;
  var k = i - 1;
  var m = 1;
  while (j < hi || k > lo) {
    var a = this.radpower[m++];
    if (j < hi) {
      this.altersingle(a, j++, b, g, r);
    }
    if (k > lo) {
      this.altersingle(a, k--, b, g, r);
    }
  }
};

NeuQuant.prototype.contest = function (b, g, r) {
  var bestd = ~(1 << 31);
  var bestbiasd = bestd;
  var bestpos = -1;
  var bestbiaspos = bestpos;
  for (var i = 0; i < netsize; i++) {
    var n = this.network[i];
    var dist = Math.abs(n[0] - b) + Math.abs(n[1] - g) + Math.abs(n[2] - r);
    if (dist < bestd) {
      bestd = dist;
      bestpos = i;
    }
    var biasdist = dist - (this.bias[i] >> intbiasshift - netbiasshift);
    if (biasdist < bestbiasd) {
      bestbiasd = biasdist;
      bestbiaspos = i;
    }
    var betafreq = this.freq[i] >> betashift;
    this.freq[i] -= betafreq;
    this.bias[i] += betafreq << gammashift;
  }
  this.freq[bestpos] += beta;
  this.bias[bestpos] -= betagamma;
  return bestbiaspos;
};

NeuQuant.prototype.inxbuild = function () {
  var previouscol = 0;
  var startpos = 0;
  for (var i = 0; i < netsize; i++) {
    var p = this.network[i];
    var smallpos = i;
    var smallval = p[1];
    for (var j = i + 1; j < netsize; j++) {
      var q = this.network[j];
      if (q[1] < smallval) {
        smallpos = j;
        smallval = q[1];
      }
    }
    var q = this.network[smallpos];
    if (i != smallpos) {
      var j = q[0];
      q[0] = p[0];
      p[0] = j;
      j = q[1];
      q[1] = p[1];
      p[1] = j;
      j = q[2];
      q[2] = p[2];
      p[2] = j;
      j = q[3];
      q[3] = p[3];
      p[3] = j;
    }
    if (smallval != previouscol) {
      this.netindex[previouscol] = startpos + i >> 1;
      for (var j = previouscol + 1; j < smallval; j++) {
        this.netindex[j] = i;
      }
      previouscol = smallval;
      startpos = i;
    }
  }
  this.netindex[previouscol] = startpos + maxnetpos >> 1;
  for (var j = previouscol + 1; j < 256; j++) {
    this.netindex[j] = maxnetpos;
  }
};

NeuQuant.prototype.learn = function () {
  var lengthcount = this.pixels.length;
  var alphadec = 30 + (this.samplefac - 1) / 3;
  var samplepixels = lengthcount / (3 * this.samplefac);
  var delta = ~~(samplepixels / ncycles);
  var alpha = initalpha;
  var radius = initradius;
  var rad = radius >> radiusbiasshift;
  if (rad <= 1) rad = 0;
  for (var i = 0; i < rad; i++) {
    this.radpower[i] = alpha * ((rad * rad - i * i) * radbias / (rad * rad));
  }
  var step;
  if (lengthcount < 1509) {
    this.samplefac = 1;
    step = 3;
  } else if (lengthcount % 499 !== 0) {
    step = 3 * 499;
  } else if (lengthcount % 491 !== 0) {
    step = 3 * 491;
  } else if (lengthcount % 487 !== 0) {
    step = 3 * 487;
  } else {
    step = 3 * 503;
  }
  var pix = 0;
  var i = 0;
  while (i < samplepixels) {
    var b = (this.pixels[pix] & 0xff) << netbiasshift;
    var g = (this.pixels[pix + 1] & 0xff) << netbiasshift;
    var r = (this.pixels[pix + 2] & 0xff) << netbiasshift;
    var j = this.contest(b, g, r);
    this.altersingle(alpha, j, b, g, r);
    if (rad !== 0) this.alterneigh(rad, j, b, g, r);
    pix += step;
    if (pix >= lengthcount) pix -= lengthcount;
    i++;
    if (delta === 0) delta = 1;
    if (i % delta === 0) {
      alpha -= alpha / alphadec;
      radius -= radius / radiusdec;
      rad = radius >> radiusbiasshift;
      if (rad <= 1) rad = 0;
      for (var j = 0; j < rad; j++) {
        this.radpower[j] = alpha * ((rad * rad - j * j) * radbias / (rad * rad));
      }
    }
  }
};

NeuQuant.prototype.map = function (b, g, r) {
  var bestd = 1000;
  var best = -1;
  var i = this.netindex[g];
  var j = i - 1;
  while (i < netsize || j >= 0) {
    if (i < netsize) {
      var p = this.network[i];
      var dist = p[1] - g;
      if (dist >= bestd) break;
      i++;
      if (dist < 0) dist = -dist;
      var a = p[0] - b;
      if (a < 0) a = -a;
      dist += a;
      if (dist < bestd) {
        a = p[2] - r;
        if (a < 0) a = -a;
        dist += a;
        if (dist < bestd) {
          bestd = dist;
          best = p[3];
        }
      }
    }
    if (j >= 0) {
      var p = this.network[j];
      var dist = g - p[1];
      if (dist >= bestd) break;
      j--;
      if (dist < 0) dist = -dist;
      var a = p[0] - b;
      if (a < 0) a = -a;
      dist += a;
      if (dist < bestd) {
        a = p[2] - r;
        if (a < 0) a = -a;
        dist += a;
        if (dist < bestd) {
          bestd = dist;
          best = p[3];
        }
      }
    }
  }
  return best;
};

NeuQuant.prototype.process = function () {
  this.learn();
  this.unbiasnet();
  this.inxbuild();
  return this.colorMap();
};

NeuQuant.prototype.colorMap = function () {
  var map = [];
  var index = [];
  for (var i = 0; i < netsize; i++) {
    index[this.network[i][3]] = i;
  }
  for (var i = 0; i < netsize; i++) {
    var j = index[i];
    map.push(this.network[j][0]);
    map.push(this.network[j][1]);
    map.push(this.network[j][2]);
  }
  return map;
};

module.exports = NeuQuant;

},{}],4:[function(require,module,exports){
'use strict';

var GIFEncoder = require('./GIFEncoder.js');

module.exports = function (data) {
  var encoder = new GIFEncoder(data.width, data.height);
  if (data.firstFrame) {
    encoder.setRepeat(data.repeat);
    encoder.setDelay(data.delay);
    encoder.setQuality(data.quality);
  }
  encoder.addFrame(data.data);
  if (data.lastFrame) {
    encoder.finish();
  }
  if (data.firstFrame) {
    return {
      data: encoder.out.getData(),
      frames: encoder.out.page,
      cursor: encoder.out.cursor
    };
  } else {
    return {
      data: encoder.out.getData(),
      frames: encoder.out.page,
      cursor: encoder.out.cursor
    };
  }
};
},{"./GIFEncoder.js":1}]},{},[4])
