import * as brain from "brain.js/browser";
import { Component, OnInit, ViewChild, HostListener, NgZone } from '@angular/core';
import { __core_private_testing_placeholder__ } from '@angular/core/testing';
import { Analyzer } from "./analyzer";

window['brain'] = brain;

/*
  brainjs: 
    https://stackabuse.com/neural-networks-in-javascript-with-brain-js/
*/

let netops = {
  hiddenLayers: [3, 27, 3]
};

// bounding rectangles, array of [x1, y1, x2, y2] inclusive
let paths = {
  "sample1.png": {
    bad: [
      [0, 0, 649, 93], // all top
      [0, 399, 639, 479], // all bottom 
      [0, 94, 93, 398], // mid left
      [440, 94, 649, 398], // mid right
    ],
    // in good areas, red of c0 at least is good, red less than a0 is probably digit
    good: [
      [109, 100, 427, 390]
    ]
  }
}

let trainingOptions = {
  errorThresh: 0.005,
  iterations: 20000,
  log: true,
  logPeriod: 10,
  learningRate: 0.3
};

let hex = n => {
  let s = n.toString(16);
  return s.length == 1 ? '0' + s : s;
}

let rgbaAt = (imageData, x, y) => {
  let offset = (y * imageData.width + x) * 4;
  if ((offset + 3) >= imageData.data.length || offset < 0) {
    return { r: 0, g: 0, b: 0, a: 0 }; // click can actually go to 640?  border?
  }
  return {
    r: imageData.data[offset],
    g: imageData.data[offset + 1],
    b: imageData.data[offset + 2],
    a: imageData.data[offset + 3],
  };
};

let setRgb = (imageData: ImageData, x, y, r, g, b, a) => {
  let offset = (y * imageData.width + x) * 4;
  if (offset < 0 || offset >= imageData.data.length) {
    return;
  }
  imageData.data[offset] = r;
  imageData.data[offset + 1] = g;
  imageData.data[offset + 2] = b;
  imageData.data[offset + 3] = a;
};

class Position {
  x: number;
  y: number;
}

class RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

@Component({
  selector: 'app-train',
  templateUrl: './train.component.html',
  styleUrls: ['./train.component.scss']
})
export class TrainComponent implements OnInit {
  @ViewChild('fileImage', { static: true }) fileImage;
  @ViewChild('canvasLoader', { static: true }) canvasLoader;
  @ViewChild('swatch', { static: true }) swatch;
  @ViewChild('canvasZoom', { static: true }) canvasZoom;
  @ViewChild('overlayCanvas', { static: true }) overlayCanvas;

  imageData: ImageData;
  fileName: string = 'sample1.png';
  width: number;
  height: number;
  colorHash: string;
  training: boolean = true;
  net: brain.NeuralNetwork;
  x: number;
  y: number;
  result: any;
  useOverlay: boolean = false;

  textColor: string = "black";

  constructor(
    public zone: NgZone,
  ) {
    window['T'] = this;
    this.net = new brain.NeuralNetwork(netops);

    // let s = localStorage.getItem('goodnet');
    // if (s) {
    //   let j = JSON.parse(s);
    //   console.log('goodnet:', j);
    //   this.net.fromJSON(j);
    //   this.training = false;
    //   setTimeout(() => { this.overlayDigits(); }, 200);
    // }
    if (this.loadNet()) {
      this.training = false;
    }
  }

  ngOnInit() {
  }

  ngAfterViewInit(): void {
    console.log('ngAfterViewInit', this.fileImage, this.canvasLoader);
    this.selectFile(this.fileName);
  }

  selectFile(fileName: string): void {
    console.log('selectFile', this.fileImage, this.canvasLoader);
    let url = `/assets/captures/${fileName}`;
    this.fileImage.nativeElement.src = url;

    // // http://localhost:4200/assets/captures/sample1.png
    // // https://developer.mozilla.org/en-US/docs/Web/API/ImageData/ImageData
    // fetch(url)
    // .then(response => {
    //   return response.blob()
    // })
    // .then(blob => {
    //   window['blob'] = blob;
    //   console.log('blob:', blob);
    // });
  }

  imageLoaded($event): void {
    // https://stackoverflow.com/questions/45365571/convert-an-image-to-imagedata-uint8clampedarray

    console.log('imageLoaded:', $event);
    let image: HTMLImageElement = this.fileImage.nativeElement;
    let canvas: HTMLCanvasElement = this.canvasLoader.nativeElement;

    let ctx = canvas.getContext("2d");
    const { width, height } = image;
    this.width = width;
    this.height = height;
    canvas.width = width;
    canvas.height = height;
    window['ctx'] = ctx;
    window['canvas'] = canvas;
    ctx.drawImage(image, 0, 0);
    this.imageData = ctx.getImageData(0, 0, width, height);

    // setTimeout(() => this.all(), 500);
    //this.highlight();
  }

  pageToImage(x, y): Position {
    let imgElement: HTMLImageElement = this.fileImage.nativeElement;
    return { x: x - imgElement.offsetLeft, y: y - imgElement.offsetTop };
  }

  onFileImageClick($event): void {
    // let x = $event.clientX - this.fileImage.nativeElement.offsetLeft;
    // let y = $event.clientY - this.fileImage.nativeElement.offsetTop;

    let imgElement: HTMLImageElement = this.fileImage.nativeElement;
    // let x = $event.pageX - imgElement.offsetLeft;
    // let y = $event.pageY - imgElement.offsetTop;
    let { x, y } = this.getPos($event);

    this.zoomOn(x, y);

    console.log(`onFileImageClick: ${x}, ${y} client (${$event.clientX}, ${$event.clientY})`);
    console.log('$event:', $event);

    let offset = (y * this.width + x) * 4;
    if ((offset + 3) >= this.imageData.data.length) {
      return; // click can actually go to 640?  border?
    }
    let r = this.imageData.data[offset];
    let g = this.imageData.data[offset + 1];
    let b = this.imageData.data[offset + 2];
    let hash = `#${hex(r)}${hex(g)}${hex(b)}`;
    this.colorHash = hash;
    this.swatch.nativeElement.style.backgroundColor = hash;
  }

  /**
   * Zoom on to a point, create a 105x105 image that represents a 21x21 section.
   * Cursor location is in the center, out of bounds is white.  Center has a
   * crosshair that is 3 pixels wide and dotted like so:
   * 
   *  3 white 3 normal 3 black 3 normal, ...
   * @param x 
   * @param y 
   */
  zoomOn(x: number, y: number) {
    let image: HTMLImageElement = this.fileImage.nativeElement;
    let canvas: HTMLCanvasElement = this.canvasZoom.nativeElement;
    let ctx = canvas.getContext('2d');
    let sx = x - 10;
    let sy = y - 10;
    let sw = 21;
    let sh = 21;
    let dx = 0;
    let dy = 0;
    let dw = 105;
    let dh = 105;
    ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);

    ctx.strokeStyle = "green";
    ctx.lineWidth = 3;
    let half = 53;
    ctx.moveTo(half, 0);
    ctx.lineTo(half, 105);
    ctx.moveTo(0, half);
    ctx.lineTo(106, half);
    ctx.stroke();
  }

  getPos($event: MouseEvent) {
    let bounds = (<HTMLElement>$event.srcElement).getBoundingClientRect();
    // sample: x: 10, y: -127.5, width: 642, height: 482 (guessing width, height include border, so sub 1?)
    // client x,y is 650, 353 at very end
    // image x is client.x - bounds.x - 1
    // image y is client.y - bounds.y - 1 (479.5

    return {
      x: Math.trunc($event.clientX - bounds.left - 1),
      y: Math.trunc($event.clientY - bounds.top - 1)
    }
  }

  mousemove($event: MouseEvent): void {
    // window['pos'] = {
    //   clientX: $event.clientX,
    //   clientY: $event.clientY,
    //   screenX: $event.screenX,
    //   screenY: $event.screenY,
    //   pageX: $event.pageX,
    //   pageY: $event.pageY,
    //   srcElement: $event.srcElement
    // };
    if (!this.imageData) return;
    let { x, y } = this.getPos($event);
    this.zoomOn(x, y);
    let { r, g, b, a } = rgbaAt(this.imageData, x, y);
    let hash = `#${hex(r)}${hex(g)}${hex(b)}`;
    this.colorHash = hash;
    this.swatch.nativeElement.style.backgroundColor = hash;
    let clamp = 0xa8;
    this.textColor = (r < clamp && g < clamp && b < clamp) ? 'white' : 'black';
    this.x = x;
    this.y = y;
    if (!this.training) {
      let result = this.net.run({ r: r / 255, g: g / 255, b: b / 255 });
      let obj = {
        outside: Math.trunc(result.outside * 100),
        inside: Math.trunc(result.inside * 100),
        blank: Math.trunc(result.blank * 100),
        digit: Math.trunc(result.digit * 100)
      }
      this.result = obj;
    }
  }

  @HostListener('window:keydown', ['$event'])
  keyDown(event: KeyboardEvent) {
    if (this.training) {
      if (event.keyCode === 65) { // 'a'

      }
    }
  }

  loadNet(): boolean {
    let json = localStorage.getItem('saved_net');
    if (json) {
      this.net.fromJSON(JSON.parse(json));
      return true;
    }
    return false;
  }

  saveNet() {
    let json = JSON.stringify(this.net.toJSON());
    localStorage.setItem('saved_net', json);
  }

  autoTrain() {
    let start = window.performance.now();

    let all = []; // each is array of r, g, b, and values for ["inside", "outside", "blank", "digit"]
    let path = paths['sample1.png'];
    path.bad.forEach(bad => {
      for (let x = bad[0]; x <= bad[2]; x++) {
        for (let y = bad[1]; y <= bad[3]; y++) {
          let color = rgbaAt(this.imageData, x, y);
          all.push({
            input: {
              r: color.r / 255,
              g: color.g / 255,
              b: color.b / 255
            },
            output: {
              outside: 1,
              inside: 0,
              blank: 0,
              digit: 0
            }
          });
        }
      }
    });
    path.good.forEach(good => {
      for (let x = good[0]; x <= good[2]; x++) {
        for (let y = good[1]; y <= good[3]; y++) {
          let color = rgbaAt(this.imageData, x, y);

          let r = color.r;
          let blank = r < 0x90 ? 0 : (r > 0xb0 ? 1 : ((r - 0x90) / 0x20));
          blank = color.b > 0xc8 ? 1 : 0;
          all.push({
            input: {
              r: color.r / 255,
              g: color.g / 255,
              b: color.b / 255
            },
            output: {
              outside: 0,
              inside: 1,
              // blank: color.r > 0xc0 ? 1 : (color.r < 0xa4 ? 0 : 0.5),
              // digit: color.r > 0xc0 ? 0 : (color.r < 0xa4 ? 1 : 0.5),
              blank: blank,
              digit: 1 - blank
            }
          });
        }
      }
    });

    let created = window.performance.now();

    // randomize
    for (let i = 0; i < all.length - 1; i++) {
      let o = Math.trunc(Math.random() * (all.length - i));
      if (o !== i) {
        let tmp = all[i];
        all[i] = all[o];
        all[o] = tmp;
      }
    }

    let randomized = window.performance.now();

    let slice = all.slice(0, 2500); // 3 seconds to train 100
    const crossValidate = new brain.CrossValidate(brain.NeuralNetwork, netops);
    const stats = crossValidate.train(slice);
    this.net = crossValidate.toNeuralNetwork();

    let trained = window.performance.now();

    console.log(`create: ${created - start}`);
    console.log(`randomized: ${randomized - created}`);
    console.log(`trained: ${trained - randomized}`);
    console.log('stats:', stats);

    this.training = false;
  }

  netAt(x, y) {
    let { r, g, b, a } = rgbaAt(this.imageData, x, y);
    return this.net.run({ r: r / 255, g: g / 255, b: b / 255 });
  }

  highlight(type: string = 'inside') {
    if (this.training) return;

    let start = window.performance.now();
    let id = new ImageData(this.width, this.height);

    let func = this.isInside.bind(this);
    switch (type) {
      case 'blank':
        func = this.isBlank.bind(this);
        break;
      case 'outside':
        func = this.isOutside.bind(this);
        break;
      case 'digit':
        func = this.isDigit.bind(this);
        break;
      default:
        func = this.isInside.bind(this);
        break;
    }

    let transform = (x, y) => {
      // let { r, g, b, a } = rgbaAt(this.imageData, x, y);
      // let result = this.net.run({ r: r / 255, g: g / 255, b: b / 255 });
      // if ((result.inside >= 0.8 && result.outside < 0.01)) { // && result.digit > result.blank
      if (func(this.netAt(x, y))) {
        setRgb(id, x, y, 128, 255, 128, 255);
      } else {
        setRgb(id, x, y, 0, 0, 0, 0);
      }
    };

    // 112, 388 to 426, 388 is a line at the bottom that should be all inside, blank, and 0 digit
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        transform(x, y);
      }
    }

    let end = window.performance.now();
    console.log(`new image data ${this.width}, ${this.height}`)
    console.log(`overlayDigits: ${end - start} ms`);

    let canvas: HTMLCanvasElement = this.overlayCanvas.nativeElement;
    canvas.height = this.height;
    canvas.width = this.width;
    let ctx = canvas.getContext('2d');
    ctx.putImageData(id, 0, 0);
    this.useOverlay = true;
  }

  all() {
    this.zone.run(() => {
      this.autoTrain();
      this.highlight();
    });
  }

  isInside(result) {
    return result.inside >= 0.8 && result.outside < 0.05;
  }

  isDigit(result) {
    // return this.isInside(result) && result.digit > 0.1;
    return result.inside > 0.9 && result.digit > 0.1;
  }

  isBlank(result) {
    // return this.isInside(result) && result.digit > 0.1;
    return result.inside > 0.9 && result.digit < 0.1;
  }

  isOutside(result) {
    // return this.isInside(result) && result.digit > 0.1;
    return !this.isInside(result);
  }

  findCenter() {
    let start = window.performance.now();

    // scan from center, MUST be inside, move up/down/left/right to find bounds
    let x = this.width / 2;
    let y = this.height / 2;
    if (!this.isInside(this.netAt(x, y))) {
      return null;
    }

    let range: any = {};

    for (let i = x + 1; i < this.width; i++) {
      if (!this.isInside(this.netAt(i, y))) {
        range.right = i - 1;
        break;
      }
    }
    for (let i = x - 1; i >= 0; i--) {
      if (!this.isInside(this.netAt(i, y))) {
        range.left = i - 1;
        break;
      }
    }
    for (let i = y + 1; i < this.height; i++) {
      if (!this.isInside(this.netAt(x, i))) {
        range.bottom = i - 1;
        break;
      }
    }
    for (let i = y - 1; i >= 0; i--) {
      if (!this.isInside(this.netAt(x, i))) {
        range.top = i - 1;
        break;
      }
    }

    console.log('range:', JSON.stringify(range, null, 2), window.performance.now() - start);
  }

  /**
   * Each row and column has count of 'inside', and bounds (x1, x2 or y1, y2).  This can be
   */
  findarea() {
    var a = new Analyzer(this.imageData, this.net);
    window['a'] = a;
  }

  highlightBounds() {
    let a = new Analyzer(this.imageData, this.net);
    window['ana'] = a;
    let bounds = a.findBounds();
    let cols = bounds.cols;

    let canvas: HTMLCanvasElement = this.overlayCanvas.nativeElement;
    canvas.height = this.height;
    canvas.width = this.width;
    let ctx = canvas.getContext('2d');
    this.useOverlay = true;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.strokeStyle = "blue";
    ctx.moveTo(cols[0].x, cols[0].y1);
    for (let i = 1; i < cols.length; i++) {
      let col = cols[i];
      ctx.lineTo(col.x, col.y1);
    }
    ctx.lineTo(cols[cols.length - 1].x, cols[cols.length - 1].y2);
    for (let i = cols.length - 1; i >= 0; i--) {
      let col = cols[i];
      ctx.lineTo(col.x, col.y2);
    }
    ctx.lineTo(cols[0].x, cols[0].y1);
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle =  "red";
    ctx.moveTo(bounds.ax, bounds.ay);
    ctx.lineTo(bounds.bx, bounds.by);
    ctx.lineTo(bounds.cx, bounds.cy);
    ctx.lineTo(bounds.dx, bounds.dy);
    ctx.lineTo(bounds.ax, bounds.ay);
    ctx.stroke();

    console.log('bounds:', bounds);
  }

  skewImage() {
    let a = new Analyzer(this.imageData, this.net);
    let { cols } = a.findBounds();
    let slopes = a.getSlopes(cols);
    console.log('slopes:', slopes);
    if (!slopes) {
      console.log('Could not find slope!');
      return;
    }
    console.log('slopes:', slopes);
  }

  transformImage() {
    let a = new Analyzer(this.imageData, this.net);
    let start = performance.now();
    let bounds = a.findBounds();
    let timeBounds = performance.now() - start;
    start = performance.now();
    let newData = a.getTransformedImage(bounds);
    let timeTransform = performance.now() - start;
    start = performance.now();

    let canvas: HTMLCanvasElement = this.overlayCanvas.nativeElement;
    canvas.height = newData.height;
    canvas.width = newData.width;
    let ctx = canvas.getContext('2d');
    ctx.putImageData(newData, 0, 0);
    let timePutImage = performance.now() - start;

    this.useOverlay = true;
    console.log(`Bounds: ${timeBounds} ms`);
    console.log(`Transform: ${timeTransform} ms`);
    console.log(`PutImage: ${timePutImage} ms`);
  }

  tryWorker() {
    if (typeof Worker !== 'undefined') {
      // Create a new
      console.log('creating worker');
      const worker = new Worker('./train.worker', { type: 'module' });
      worker.onmessage = ({ data }) => {
        console.log(`page got message: ${data}`);
      };
      worker.onerror = error => {
        console.log('worker.onerror:', error);
      };
      worker.postMessage('hello');
      console.log('posted message to:', worker);
    } else {
      console.log('web workers are not supported!');
    }
  }
}

// if (typeof Worker !== 'undefined') {
//   // Create a new
//   const worker = new Worker('./train.worker', { type: 'module' });
//   worker.onmessage = ({ data }) => {
//     console.log(`page got message: ${data}`);
//   };
//   worker.postMessage('hello');
// } else {
//   // Web Workers are not supported in this environment.
//   // You should add a fallback so that your program still executes correctly.
// }