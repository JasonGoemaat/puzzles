import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { DominosComponent } from './puzzle/dominos/dominos.component';
import { SudokuComponent } from './puzzle/sudoku/sudoku.component';

const routes: Routes = [
  { path: '', redirectTo: '/dominos', pathMatch: 'full' },
  { path: 'dominos', component: DominosComponent },
  { path: 'sudoku', component: SudokuComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
