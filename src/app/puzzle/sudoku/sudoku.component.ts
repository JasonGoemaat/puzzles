import { Component, OnInit, HostListener } from '@angular/core';

@Component({
  selector: 'app-sudoku',
  templateUrl: './sudoku.component.html',
  styleUrls: ['./sudoku.component.scss']
})
export class SudokuComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }

  @HostListener('window:keyup', ['$event'])
  keyDown(event: KeyboardEvent) {
    console.log(`sudoku: ${event.keyCode}`)
  }
}
