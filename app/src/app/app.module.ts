import { BrowserModule } from '@angular/platform-browser';
import { NgModule, LOCALE_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatToolbarModule, MatTabsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatCheckboxModule, MatButtonModule, MatIconModule } from '@angular/material';
import { AngularFireModule } from '@angular/fire';
import { environment } from '../environments/environment';
import { AngularFireDatabaseModule } from '@angular/fire/database';
import { AngularFireAuthModule } from '@angular/fire/auth';
import { LoginNavigationComponent } from './login-navigation/login-navigation.component';
import { RoundsComponent } from './rounds/rounds.component';
import { PastRoundComponent } from './past-round/past-round.component';
import { PresentRoundComponent } from './present-round/present-round.component';
import { FutureRoundComponent } from './future-round/future-round.component';
import { HttpClientModule } from '@angular/common/http';
import { RoundInfoComponent } from './round-info/round-info.component';
import { registerLocaleData } from '@angular/common';
import localeCs from '@angular/common/locales/cs';
import { FireFormDirective } from './fire-form.directive';
import { ActionFormComponent } from './action-form/action-form.component';
import { ReactiveFormsModule } from '@angular/forms';
import { DelegateNameComponent } from './delegate-name/delegate-name.component';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDialogModule } from '@angular/material/dialog';
import { MatListModule } from '@angular/material/list';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material';
import { ProcessingRoundComponent } from './processing-round/processing-round.component';
import { VotingComponent } from './voting/voting.component';
import { UnitsComponent } from './units/units.component';
import { DecretFormComponent } from './decret-form/decret-form.component';

@NgModule({
  declarations: [
    AppComponent,
    LoginNavigationComponent,
    RoundsComponent,
    PastRoundComponent,
    PresentRoundComponent,
    FutureRoundComponent,
    RoundInfoComponent,
    FireFormDirective,
    ActionFormComponent,
    DelegateNameComponent,
    ProcessingRoundComponent,
    VotingComponent,
    UnitsComponent,
    DecretFormComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    MatToolbarModule,
    MatTableModule,
    MatTabsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDialogModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    FormsModule,
    MatProgressSpinnerModule,
    MatListModule,
    MatAutocompleteModule,
    AngularFireModule.initializeApp(environment.firebase),
    AngularFireDatabaseModule,
    AngularFireAuthModule,
    ReactiveFormsModule
  ],
  providers: [{ provide: LOCALE_ID, useValue: 'cs' }],
  bootstrap: [AppComponent]
})
export class AppModule { }

registerLocaleData(localeCs, 'cs');
