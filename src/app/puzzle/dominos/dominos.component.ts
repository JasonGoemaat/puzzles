import { Component, OnInit, HostListener } from '@angular/core';
import { DominoPuzzle, DominoSquare } from './domino-puzzle';
import { MatDialog } from '@angular/material/dialog';
import { CaptureDialogComponent } from 'src/app/capture-dialog/capture-dialog.component';

@Component({
  selector: 'app-dominos',
  templateUrl: './dominos.component.html',
  styleUrls: ['./dominos.component.scss']
})
export class DominosComponent implements OnInit {

  puzzle: DominoPuzzle;
  rows: DominoSquare[][];

  constructor(
    public dialog: MatDialog,
  ) {
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

  capture() {
    const dialogRef = this.dialog.open(CaptureDialogComponent, {
      width: '800px',
      data: { name: 'Nobody', animal: 'Penguin' }
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed:', result);
    });
  }
}
