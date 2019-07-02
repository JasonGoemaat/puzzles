import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DominosComponent } from './dominos/dominos.component';
import { SudokuComponent } from './sudoku/sudoku.component';
import { MaterialModule } from '../material/material.module';

@NgModule({
  declarations: [DominosComponent, SudokuComponent],
  imports: [
    CommonModule,
    MaterialModule,
  ]
})
export class PuzzleModule { }
