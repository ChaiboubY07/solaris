import { Component, signal } from '@angular/core';
import { SolarSystem } from './features/solar-system/components/solar-system/solar-system';

@Component({
  selector: 'app-root',
  imports: [SolarSystem],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('solaris');
}
