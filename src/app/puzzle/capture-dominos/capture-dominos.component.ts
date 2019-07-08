import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy, NgZone } from '@angular/core';
import { Analyzer } from 'src/app/train/analyzer';
import { PuzzleAnalyzer } from './puzzle-analyzer';
import { DigitAnalyzer } from './digit-analyzer';

@Component({
  selector: 'app-capture-dominos',
  templateUrl: './capture-dominos.component.html',
  styleUrls: ['./capture-dominos.component.scss']
})
export class CaptureDominosComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('video', { static: true }) video;
  @ViewChild('canvasCapture', { static: true }) capture;
  @ViewChild('canvasBounds', { static: true }) bounds;
  @ViewChild('canvasTransformed', { static: true }) transformed;
  @ViewChild('canvasScanned', { static: true }) scanned;
  @ViewChild('canvasDigits', { static: true }) digits;

  eVideo: HTMLVideoElement;
  eCapture: HTMLCanvasElement;
  eBounds: HTMLCanvasElement;
  eTransformed: HTMLCanvasElement;
  eScanned: HTMLCanvasElement;
  eDigits: HTMLCanvasElement;

  textVideo: string;
  textCapture: string = "hello world!";
  textBounds: string;
  textTransformed: string;
  textScanned: string;
  textDigits: string;

  stream: MediaStream;
  track: MediaStreamTrack;

  streaming: boolean = false;
  videoWidth: number;
  videoHeight: number;
  working: boolean = false;

  captureData: ImageData;
  boundsData: any;
  transformedData: ImageData;
  scannedData: ImageData;
  digitsData: ImageData;

  constructor(
    public zone: NgZone
  ) {
    window['cdc'] = this;
  }

  ngOnInit() {
  }

  ngAfterViewInit(): void {
    this.eVideo = this.video.nativeElement;
    this.eCapture = this.capture.nativeElement;
    this.eBounds = this.bounds.nativeElement;
    this.eTransformed = this.transformed.nativeElement;
    this.eScanned = this.scanned.nativeElement;
    this.eDigits = this.digits.nativeElement;

    this.beginStreaming();
  }

  ngOnDestroy() {
    console.log('onDestroy!');
    if (this.streaming) {
      this.track.stop();
    }
  }

  beginStreaming() {
    let video = this.eVideo;

    let promise = new Promise<MediaStream>((resolve, reject) => {
      navigator.getUserMedia({ video: true, audio: false }, resolve, reject);
    });

    promise.then(stream => {
      this.zone.run(() => {
        let video = this.eVideo;

        this.stream = stream;
        console.log('stream:', stream);

        let streaming: boolean = false;
        video.addEventListener('canplay', event => {
          if (!streaming) {
            this.videoWidth = video.videoWidth;
            this.videoHeight = video.videoHeight;
            this.eCapture.width = this.eBounds.width = this.eTransformed.width = this.eScanned.width = this.eDigits.width = this.videoWidth;
            this.eCapture.height = this.eBounds.height = this.eTransformed.height = this.eScanned.height = this.eDigits.height = this.videoHeight;
            streaming = true;
          }
        });

        video.srcObject = stream;
        video.play();
        this.track = stream.getVideoTracks()[0];
        this.doWork();
      });
    });
  }

  doWork() {
    if (this.working) {
      return;
    }

    this.working = true;
    setTimeout(() => {
      this.zone.run(() => {
        this.captureFrame()
        .then(this.findBounds.bind(this))
        .then(this.scanAndMap.bind(this))
        .then(this.findDigits.bind(this));
        this.working = false;
        this.doWork();
      });
    }, 50);
  }

  async captureFrame() {
    let start = window.performance.now();
    const ctx = this.eCapture.getContext('2d');
    ctx.drawImage(this.eVideo, 0, 0, this.videoWidth, this.videoHeight);
    this.captureData = ctx.getImageData(0, 0, this.videoWidth, this.videoHeight);
    let ms = window.performance.now() - start;

    this.textCapture = `${ms.toFixed(0)} ms`;
  }

  async findBounds() {
    let start = performance.now();

    let analyzer = new Analyzer(this.captureData, null);
    let bounds = analyzer.findBounds(true, false);

    let ctx = this.eBounds.getContext('2d');
    ctx.putImageData(this.captureData, 0, 0);
    ctx.beginPath();
    ctx.strokeStyle =  "red";
    ctx.moveTo(bounds.ax, bounds.ay);
    ctx.lineTo(bounds.bx, bounds.by);
    ctx.lineTo(bounds.cx, bounds.cy);
    ctx.lineTo(bounds.dx, bounds.dy);
    ctx.lineTo(bounds.ax, bounds.ay);
    ctx.stroke();

    let ms = performance.now() - start;

    this.textBounds = `${ms.toFixed(0)} ms`;
    this.boundsData = bounds;

    let tstart = performance.now();
    ctx = this.eTransformed.getContext('2d');
    ctx.fillStyle = 'black';
    ctx.clearRect(0, 0, this.videoWidth, this.videoHeight);

    let ds = [bounds.bx - bounds.ax, bounds.cx - bounds.dx, bounds.dy - bounds.ay, bounds.cy - bounds.by];
    if (ds[0] > 250 && ds[1] > 250 && ds[2] > 200 && ds[3] > 200) {
      this.transformedData = analyzer.getTransformedImage(bounds)
      ctx.putImageData(this.transformedData, 0, 0);
      let t2 = performance.now() - tstart;
      this.textTransformed = `${t2.toFixed(0)} ms`;
    } else {
      this.textTransformed = JSON.stringify(ds);
    }
  }

  async scanAndMap() {
    let start = performance.now();

    let analyzer = new PuzzleAnalyzer(this.transformedData);
    this.scannedData = analyzer.scan();
    let ctx = this.eScanned.getContext('2d');
    ctx.clearRect(0, 0, this.eScanned.width, this.eScanned.height);
    ctx.putImageData(this.scannedData, 0, 0);
    let ms = window.performance.now() - start;

    this.textScanned = `${ms.toFixed(0)} ms`;
  }

  async findDigits() {
    let da = new DigitAnalyzer(this.scannedData);
    let rowsAndCols = da.findRowsAndCols();
    console.log('rowsAndCols:', rowsAndCols);

    let ctx = this.eDigits.getContext('2d');
    ctx.clearRect(0, 0, this.eDigits.width, this.eDigits.height);
    ctx.putImageData(this.scannedData, 0, 0);

    ctx.beginPath();
    ctx.strokeStyle = "green";
    rowsAndCols.cols.forEach(col => {
      let x = col.x1 - 0.5;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.scannedData.height + 0.5);
      x = col.x2 + 0.5;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.scannedData.height + 0.5);
    });
    rowsAndCols.rows.forEach(row => {
      let y= row.y1 - 0.5;
      ctx.moveTo(0, y);
      ctx.lineTo(this.scannedData.width + 0.5, y);
      y = row.y2 + 0.5;
      ctx.moveTo(0, y);
      ctx.lineTo(this.scannedData.width + 0.5, y);
    });
    ctx.stroke();

    // let da = new DigitAnalyzer(this.scannedData);
    // let rowsAndCols = da.findRowsAndCols();
    // console.log('rowsAndCols:', rowsAndCols);

    // ctx.beginPath();
    // ctx.strokeStyle = "green";
    // rowsAndCols.cols.forEach(col => {
    //   let x = col.x1 - 0.5;
    //   ctx.moveTo(x, 0);
    //   ctx.lineTo(x, nd.height + 0.5);
    //   x = col.x2 + 0.5;
    //   ctx.moveTo(x, 0);
    //   ctx.lineTo(x, nd.height + 0.5);
    // });
    // rowsAndCols.rows.forEach(row => {
    //   let y= row.y1 - 0.5;
    //   ctx.moveTo(0, y);
    //   ctx.lineTo(nd.width + 0.5, y);
    //   y = row.y2 + 0.5;
    //   ctx.moveTo(0, y);
    //   ctx.lineTo(nd.width + 0.5, y);
    // });
    // ctx.stroke();
  }
}
