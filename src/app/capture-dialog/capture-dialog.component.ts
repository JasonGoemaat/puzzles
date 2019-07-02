import { Component, OnInit, Inject, ViewChild, OnDestroy, HostListener } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";

// https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Taking_still_photos
// https://www.html5rocks.com/en/tutorials/getusermedia/intro/
// https://developer.mozilla.org/en-US/docs/Web/API/MediaSource
// https://stackoverflow.com/questions/33975431/how-can-i-capture-an-image-via-the-users-webcam-using-getusermedia


@Component({
  selector: 'app-capture-dialog',
  templateUrl: './capture-dialog.component.html',
  styleUrls: ['./capture-dialog.component.scss']
})
export class CaptureDialogComponent implements OnInit, OnDestroy {
  stream: MediaStream;
  track: MediaStreamTrack;

  constructor(
    public dialogRef: MatDialogRef<CaptureDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    window['CAP'] = this;
  }

  ngOnInit() {
  }

  ngOnDispose() {

  }

  @ViewChild('video', { static: true }) video: any;
  @ViewChild('canvas', { static: true }) canvas: any;
  canvasElement: HTMLCanvasElement;
  videoElement: HTMLVideoElement;
  haveVideo: boolean = false;
  havePicture: boolean = false;
  isLoading: boolean = true;
  videoWidth: number;
  videoHeight: number;

  ngAfterViewInit(): void {
    this.canvasElement = this.canvas.nativeElement;
    this.videoElement = this.video.nativeElement;

    let promise = new Promise<MediaStream>((resolve, reject) => {
      navigator.getUserMedia({ video: true, audio: false }, resolve, reject);
    });

    promise.then(stream => {
      this.stream = stream;
      console.log('stream:', stream);
      let video = <HTMLVideoElement>this.video.nativeElement;

      let streaming: boolean = false;
      video.addEventListener('canplay', event => {
        if (!streaming) {
          this.videoWidth = video.videoWidth;
          this.videoHeight = video.videoHeight;
          video.width = this.canvasElement.width = this.videoWidth;
          video.height = this.canvasElement.height = this.videoHeight;
          console.log('Video size:', video.videoHeight, video.videoWidth);
          streaming = true;
        }
      });

      video.srcObject = stream;
      video.play();
      this.isLoading = false;
      this.haveVideo = true;
      this.track = stream.getVideoTracks()[0];
    });
  }

  stopVideo() {
    if (this.track) {
      this.track.stop();
    }
  }

  ngOnDestroy() {
    this.stopVideo();
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  takePicture(): void {
    const context = this.canvasElement.getContext('2d');
    context.drawImage(this.videoElement, 0, 0, this.videoWidth, this.videoHeight);
    var imageData = context.getImageData(0, 0, this.videoWidth, this.videoHeight);
    window['imageData'] = imageData;
    var data = this.canvasElement.toDataURL('image/png');
    localStorage['image-data'] = data;
    console.log('data size:', data.length);
    this.havePicture = true;
    this.haveVideo = false;
    this.stopVideo();
  }

  @HostListener('window:keydown', ['$event'])
  keyDown(event: KeyboardEvent) {
    if (this.haveVideo) {
      if (event.keyCode !== 27) {
        this.takePicture();
        // this.videoElement.style.display = 'none';
        // this.canvasElement.style.position = 'relative';
        // this.canvasElement.style.top = '0';
        event.preventDefault();
      }
      return;
    }
  }
}
