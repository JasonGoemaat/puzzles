import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DominosComponent } from './dominos.component';

describe('DominosComponent', () => {
  let component: DominosComponent;
  let fixture: ComponentFixture<DominosComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DominosComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DominosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
