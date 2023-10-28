import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { HttpClient } from '@angular/common/http';
import { SignInResponse } from '../model';
import { AngularFireDatabase } from '@angular/fire/database';
import { Observable, of } from 'rxjs';
import { flatMap, tap, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-login-navigation',
  templateUrl: './login-navigation.component.html',
  styleUrls: ['./login-navigation.component.css']
})
export class LoginNavigationComponent implements OnInit {

  constructor(public firebaseAuth: AngularFireAuth, public http: HttpClient, public db: AngularFireDatabase) {
  }

  title = "Komunikace s vedením"
  passwordError = false
  loading = false
  initializing = true
  delegateName: Observable<string>
  votingQuestion: Observable<string>
  units = false

  ngOnInit() {
    this.delegateName = this.firebaseAuth.authState.pipe(flatMap((state, _) => {
      if (state == null) {
        return of(null) as Observable<string>
      } else {
        this.votingQuestion = this.db.object("landsraad/currentQuestion").valueChanges().pipe(
          flatMap((questionId, _) => {
            // show voting only those with voting rights
            return this.db.list("landsraad/votingRights", ref => ref.orderByChild("controlledBy").equalTo(state.uid)).snapshotChanges().pipe(
              map(
                snapshots => {
                  if (snapshots.length > 0) {
                    return questionId
                  } else {
                    return null
                  }
                })
            )
          })
        ) as Observable<string>
        return this.db.object("delegates/" + state.uid + "/name").valueChanges() as Observable<string>
      }
    }), tap(
      _ => {
        this.initializing = false
      }
    ))

  }

  login(password) {
    this.loading = true
    this.passwordError = false
    let passwordValue = (password == undefined) ? "" : password.value
    console.log("url", `${environment.databaseFunctionsUrl}/login?password=${passwordValue}`)
    this.http.get<SignInResponse>(`${environment.databaseFunctionsUrl}/login?password=${passwordValue}`).subscribe(
      (data: SignInResponse) => {
        if (data.invalidPassword) {
          this.loading = false
          this.passwordError = true
        } else {
          this.passwordError = false
          this.firebaseAuth.auth.signInWithCustomToken(data.token);
          this.ngOnInit()
        }
      }
    )
  }

  logout() {
    this.loading = false
    this.firebaseAuth.auth.signOut();
  }

  goToUnits() {
    this.units = true
  }

  goToRounds() {
    this.units = false
  }

}
