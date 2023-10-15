import { Component, OnInit, Input } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ALL_DECREE } from '../../../../common/config';
import { AngularFireDatabase, snapshotChanges } from '@angular/fire/database';
import { AngularFireAuth } from '@angular/fire/auth';
import { MatDialog } from '@angular/material';
import { take, tap } from 'rxjs/operators';
import { AvailableQuestion } from '../model';

@Component({
  selector: 'app-decret-form',
  templateUrl: './decret-form.component.html',
  styleUrls: ['./decret-form.component.css']
})
export class DecretFormComponent implements OnInit {

  constructor(private fb: FormBuilder, private db: AngularFireDatabase, private auth: AngularFireAuth, private dialog: MatDialog) { }

  decretForm: FormGroup;
  title: string
  state: string;

  allDecree = ALL_DECREE
  availableDecree: String[]

  @Input()
  house: AvailableQuestion

  @Input()
  roundId: string
  
  @Input()
  delegateId: string

  questionsPath: string

  ngOnInit() {
    this.decretForm = this.fb.group({
      decretType: [""],
      name: [""],
      byDelegateId: [this.delegateId],
      byHouse: [this.house["byHouse"]],
      roundId: [this.roundId],
      hidden: [false]
    })
    this.title = `Návrh dekretu za rod: ${this.house["name"]}`
    this.questionsPath = this.house["dbPath"]
  }

  changeHandler(e) {
    let names = {
      'loading': "Načítání…",
      'modified': "Ukládání…",
      'synced': "Uloženo",
      'error': "Chyba ukládání!"
    }
    this.state = names[e]
  }
}
