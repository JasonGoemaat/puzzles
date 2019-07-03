import { NgModule } from '@angular/core';
import { MatButtonModule } from "@angular/material/button";
import { MatDialogModule } from "@angular/material/dialog";
import { MatInputModule } from "@angular/material/input";
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { MatSelectModule } from "@angular/material/select";
import { MatTabsModule } from "@angular/material/tabs";

@NgModule({
  exports: [
    MatButtonModule,
    MatDialogModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTabsModule,
  ]
})
export class MaterialModule { }
