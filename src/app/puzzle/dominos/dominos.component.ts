import { Component, OnInit, HostListener } from '@angular/core';
import { DominoPuzzle, DominoSquare } from './domino-puzzle';

@Component({
  selector: 'app-dominos',
  templateUrl: './dominos.component.html',
  styleUrls: ['./dominos.component.scss']
})
export class DominosComponent implements OnInit {

  puzzle: DominoPuzzle;
  rows: DominoSquare[][];

  constructor() {
    window['D'] = this;
    //this.puzzle = new DominoPuzzle();
    this.puzzle = DominoPuzzle.FromString('342112341030424004113033402221');
    this.rows = this.puzzle.getRows();
  }

  ngOnInit() {
  }

  @HostListener('window:keydown', ['$event'])
  keyDown(event: KeyboardEvent) {
    this.puzzle.handleKeyCode(event.keyCode);
    this.rows = this.puzzle.getRows();
    // console.log('rows:', this.rows);
  }

  solve() {
    this.puzzle.solve();
    this.rows = this.puzzle.getRows();
  }
}
