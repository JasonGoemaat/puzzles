import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CaptureDominosComponent } from './capture-dominos.component';

describe('CaptureDominosComponent', () => {
  let component: CaptureDominosComponent;
  let fixture: ComponentFixture<CaptureDominosComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CaptureDominosComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CaptureDominosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
