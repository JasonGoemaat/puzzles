import { Component, OnInit, ViewChild } from '@angular/core';
import * as brain from "brain.js";

@Component({
  selector: 'app-train',
  templateUrl: './train.component.html',
  styleUrls: ['./train.component.scss']
})
export class TrainComponent implements OnInit {
  @ViewChild('fileImage', { static: true }) fileImage;
  @ViewChild('canvasLoader', { static: true }) canvasLoader;
  @ViewChild('swatch', { static: true }) swatch;
  imageData: ImageData;
  fileName: string = 'sample1.png';
  width: number;
  height: number;
  colorHash: string;

  constructor() {
    window['T'] = this;
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
  }

  onFileImageClick($event): void {
    let hex = n => {
      let s = n.toString(16);
      return s.length == 1 ? '0' + s : s;
    }

    // let x = $event.clientX - this.fileImage.nativeElement.offsetLeft;
    // let y = $event.clientY - this.fileImage.nativeElement.offsetTop;

    let imgElement: HTMLImageElement = this.fileImage.nativeElement;
    let x = $event.pageX - imgElement.offsetLeft;
    let y = $event.pageY - imgElement.offsetTop;

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
}
