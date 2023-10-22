import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DecretFormComponent } from './decret-form.component';

describe('DecretFormComponent', () => {
  let component: DecretFormComponent;
  let fixture: ComponentFixture<DecretFormComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DecretFormComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DecretFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
