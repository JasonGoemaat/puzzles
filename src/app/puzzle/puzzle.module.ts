import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DominosComponent } from './dominos/dominos.component';
import { SudokuComponent } from './sudoku/sudoku.component';

@NgModule({
  declarations: [DominosComponent, SudokuComponent],
  imports: [
    CommonModule
  ]
})
export class PuzzleModule { }
