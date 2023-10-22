import { Component, OnInit, Input } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ALL_QUESTIONS } from '../../../../common/config';
import { AngularFireDatabase } from '@angular/fire/database';
import { AngularFireAuth } from '@angular/fire/auth';
import { MatDialog } from '@angular/material';
import { VotingRightWithQuestionPath } from '../model';

@Component({
  selector: 'app-decret-form',
  templateUrl: './decret-form.component.html',
  styleUrls: ['./decret-form.component.css']
})
export class DecretFormComponent implements OnInit {

  constructor(private fb: FormBuilder, private db: AngularFireDatabase, private auth: AngularFireAuth, private dialog: MatDialog) { }

  questionForm: FormGroup;
  title: string
  state: string;

  allQuestions = ALL_QUESTIONS

  @Input()
  votingRight: VotingRightWithQuestionPath

  @Input()
  roundId: string
  
  @Input()
  delegateId: string

  questionsPath: string

  ngOnInit() {
    this.questionForm = this.fb.group({
      questionType: [""],
      name: [""],
      byDelegateId: [this.delegateId],
      byVotingRightId: [""],
      roundId: [this.roundId],
      hidden: [false]
    })
    this.title = `Návrh dekretu za rod: ${this.votingRight["name"]}`
    this.questionsPath = this.votingRight["dbPath"]
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
