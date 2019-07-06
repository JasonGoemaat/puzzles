import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  constructor() {
    window['app'] = this;
  }

  title = 'puzzles';
  worker: any;

  startWorker() {
    if (typeof Worker !== 'undefined') {
      // Create a new
      console.log('creating worker');
      const worker = new Worker('./app.worker', { type: 'module' });
      this.worker = worker;
      worker.onmessage = ({ data }) => {
        console.log(`page got message: ${data}`);
      };
      worker.onerror = (...args) => {
        console.log('web worker error:', args);
      }
      worker.postMessage('hello');
    } else {
      // Web Workers are not supported in this environment.
      // You should add a fallback so that your program still executes correctly.
      console.log('web workers not supported!');
    }
  }
}

