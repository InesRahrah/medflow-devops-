import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';

import { AdminBlogFormComponent } from './admin-blog-form.component';
import { BlogService } from '../../services/blog.service';

describe('AdminBlogFormComponent', () => {
  let component: AdminBlogFormComponent;
  let fixture: ComponentFixture<AdminBlogFormComponent>;

  const blogServiceMock = {
    getAll: jasmine.createSpy('getAll').and.returnValue(of([])),
    update: jasmine.createSpy('update').and.returnValue(of({})),
    delete: jasmine.createSpy('delete').and.returnValue(of({}))
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AdminBlogFormComponent],
      imports: [FormsModule],
      providers: [
        { provide: BlogService, useValue: blogServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminBlogFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});