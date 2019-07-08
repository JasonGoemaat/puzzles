import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DominosComponent } from './dominos/dominos.component';
import { SudokuComponent } from './sudoku/sudoku.component';
import { MaterialModule } from '../material/material.module';
import { CaptureDominosComponent } from './capture-dominos/capture-dominos.component';

@NgModule({
  declarations: [DominosComponent, SudokuComponent, CaptureDominosComponent],
  imports: [
    CommonModule,
    MaterialModule,
  ]
})
export class PuzzleModule { }
