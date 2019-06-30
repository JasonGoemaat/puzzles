import { TestBed } from '@angular/core/testing';

import { KeyboardServiceService } from './keyboard-service.service';

describe('KeyboardServiceService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: KeyboardServiceService = TestBed.get(KeyboardServiceService);
    expect(service).toBeTruthy();
  });
});
