import { Component, OnInit } from '@angular/core';
import { AngularFireDatabase } from '@angular/fire/database';
import { NgForm, FormBuilder, FormGroup } from '@angular/forms';
import { Observable, combineLatest } from 'rxjs';
import { flatMap, map } from 'rxjs/operators';
import { ValueName, ValueNameExtended, QUESTION_TYPE_HLAS_LANDSRAADU } from '../../../../common/config';

@Component({
  selector: 'app-landsraad',
  templateUrl: './landsraad.component.html',
  styleUrls: ['./landsraad.component.css']
})
export class LandsraadComponent implements OnInit {

  delegates: Observable<ValueName[]>
  votingRightPaths: Observable<string[]>
  questionPaths: Observable<string[]>
  questions: Observable<ValueName[]>
  currentQuestion: Observable<string>
  alreadyVotedCount: Observable<number>
  maxVotedCount: Observable<number>
  resultsShown: Observable<boolean>
  rounds: Observable<ValueName[]>
  filteredRoundSelected: string = ""
  path: string = "landsraad/questionsConfig"
  questionsConfig: FormGroup
  showHiddenQuestions: Observable<boolean>
  filterByRoundId: Observable<string>
  votingRights: Observable<ValueName[]>

  constructor(private fb: FormBuilder, public db: AngularFireDatabase) { }

  ngOnInit() {
    this.showHiddenQuestions = this.db.object("landsraad/questionsConfig/showHiddenQuestions").valueChanges() as Observable<boolean>
    this.filterByRoundId = this.db.object("landsraad/questionsConfig/filterByRound").valueChanges() as Observable<string>
    this.questionsConfig = this.fb.group({
      showHiddenQuestions: [true],
      filterByRound: [""]
    })
    this.delegates = this.db.list("delegates").snapshotChanges().pipe(
      map(
        snapshots => {
          return snapshots.map(snapshot => {
            return { value: snapshot.key, name: snapshot.payload.val()["name"] }
          }).concat({ value: "", name: "- Nikdo -" })
        })
    )
    this.votingRightPaths = this.db.list("landsraad/votingRights", ref => ref.orderByChild("name")).snapshotChanges().pipe(
      map(
        snapshots => {
          return snapshots.map(snapshot => "landsraad/votingRights/" + snapshot.key)
        })
    )
    this.questionPaths = combineLatest(
      this.db.list("landsraad/questions").snapshotChanges(),
      this.showHiddenQuestions,
      this.filterByRoundId,
      (questionsSnapshots, showHiddenQuestions, filterByRoundId) => {
        let snapshotsFiltered = questionsSnapshots
        .filter(snapshot => {
          let question = snapshot.payload.val() as ValueNameExtended
          return this.questionEligibleToDisplay(question, showHiddenQuestions, filterByRoundId)
        })
        return snapshotsFiltered.map(snapshot => "landsraad/questions/" + snapshot.key)
      }      
    )
    this.questions = combineLatest(
      this.db.list("landsraad/questions").snapshotChanges(),
      this.showHiddenQuestions,
      this.filterByRoundId,
      (questionsSnapshots, showHiddenQuestions, filterByRoundId) => {
        let questions: ValueNameExtended[] = questionsSnapshots
        .map(snapshot => {
          let question = snapshot.payload.val()
          return {
            value: snapshot.key, 
            name: question["name"],
            roundId: question["roundId"],
            hidden: question["hidden"],
            questionType: question["questionType"]
          }
        })
        let filteredQuestions: ValueNameExtended[] = questions
        .filter(question => {
          return this.questionEligibleToDisplay(question, showHiddenQuestions, filterByRoundId)
        })
        return filteredQuestions
        .map(question => {
          return {
            value: question["value"],
            name: question["name"]
          }
        })
        .concat({ value: "", name: "- Žádná -" })
      }
    )
    this.currentQuestion = this.db.object("landsraad/currentQuestion").valueChanges() as Observable<string>
    this.alreadyVotedCount = (this.db.object("landsraad/currentQuestion").valueChanges() as Observable<string>).pipe(flatMap((currentQuestionId, _) => {
      return this.db.list("landsraad/votes/" + currentQuestionId).snapshotChanges().pipe(
        map(snaps => snaps.length)
      )
    }))
    this.maxVotedCount = this.votingRightPaths.pipe(map(items => items.length))
    this.resultsShown = this.db.object("landsraad/votingConfig/resultsShown").valueChanges() as Observable<boolean>
    this.rounds = this.db.list("rounds").snapshotChanges().pipe(
      map(
        roundsSnapshots => {
          let formattedRounds = roundsSnapshots.map(roundRef => {
            let round = roundRef.payload.val()
            let key = roundRef.key
            return {
              value: key,
              name: round["name"]
            }
          })
          formattedRounds.push({ value: "", name: "- Žádné -" })
          return formattedRounds
        }
      )
    )
    this.votingRights = this.db.list("landsraad/votingRights").snapshotChanges().pipe(
      map(
        rightsSnapshots => {
          let formattedRights = rightsSnapshots.map(rightRef => {
            let right = rightRef.payload.val()
            let key = rightRef.key
            return {
              value: key,
              name: right["name"]
            }
          })
          formattedRights.push({ value: "", name: "- Žádný -" })
          return formattedRights
        }
      )
    )
  }

  addVotingRight(form: NgForm) {
    if (form.valid) {
      this.db.list("landsraad/votingRights").push({
        name: form.value["name"],
        votes: form.value["votes"],
        controlledBy: form.value["controlledBy"]
      })
    }
  }

  addQuestion(form: NgForm) {
    if (form.valid) {
      let ref = this.db.list("landsraad/questions").push({
        name: form.value["name"],
        questionType: QUESTION_TYPE_HLAS_LANDSRAADU["value"],
        byVotingRightId: "",
        byDelegateId: "",
        roundId: "",
        hidden: false
      });
      (form.value["answers"] as string).split(",").forEach(
        answer => {
          this.db.list("landsraad/answers/" + ref.key).push({
            name: answer.trim()
          });
        }
      )
    }
  }

  currentQuestionChanged(event) {
    this.db.object("landsraad/currentQuestion").set(event.value)
  }

  toggleVotingCheckbox(event) {
    this.resultsShown = event.checked
    this.db.object("landsraad/votingConfig/resultsShown").set(event.checked)
  }

  questionEligibleToDisplay(question: ValueNameExtended, showHiddenQuestions: boolean, filterByRoundId: string) {
    // questionType available
    return !!question["questionType"]
    // shown / hidden condition
      && (showHiddenQuestions || !showHiddenQuestions && !question.hidden) 
    // roundId filtering condition
      && (filterByRoundId === "" || filterByRoundId !== "" && (!question.roundId || question.roundId === filterByRoundId))
  }
}