import {
  Component,
  computed,
  inject,
  OnChanges,
  OnInit,
  signal,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import {
  LucideAngularModule,
  UsersRound,
  Target,
  Building2,
  Brain,
  BotMessageSquare,
} from 'lucide-angular';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.css'],
})
export class Sidebar implements OnChanges {
  authService = inject(AuthService);
  user = this.authService.currentUser;
  icons = { UsersRound, Target, Building2, Brain, BotMessageSquare };
  ngOnChanges() {
    console.log(this.user());
  }
  userName = computed(() => {
    const name = this.user()?.name;
    if (!name) return '';
    if (typeof name === 'string') return name;
    return name.en;
  });
}
