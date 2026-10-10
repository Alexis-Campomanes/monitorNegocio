import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { Store } from '../../core/store';

const DEMO_EMAIL = 'valeria.rios@empresa.com';

@Component({
  selector: 'app-login',
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly store = inject(Store);
  private readonly router = inject(Router);

  protected readonly demoEmail = DEMO_EMAIL;
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly showPassword = signal(false);
  protected readonly error = signal('');

  protected submit(): void {
    const error = this.store.login(this.email(), this.password());
    if (error) {
      this.error.set(error);
      return;
    }
    this.router.navigate(['/pedidos']);
  }

  protected fillDemo(): void {
    this.email.set(DEMO_EMAIL);
    this.password.set('demo1234');
    this.error.set('');
  }
}
