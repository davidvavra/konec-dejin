import { Component, OnInit, Input } from '@angular/core';
import { FormBuilder, FormGroup, NgForm } from '@angular/forms';
import { TENSES, COUNTRIES, findValueName, SIZES, ValueName } from '../../../../common/config';
import { AngularFireDatabase, DatabaseSnapshot, AngularFireAction } from '@angular/fire/database';
import { Observable, combineLatest } from 'rxjs';
import { map, take, tap } from 'rxjs/operators';
import { ngxCsv } from 'ngx-csv/ngx-csv';
import { Papa } from 'ngx-papaparse';
import { MatDialog } from '@angular/material';
import { DeleteConfirmDialogComponent } from '../delete-confirm-dialog/delete-confirm-dialog.component';

@Component({
  selector: 'app-round',
  templateUrl: './round.component.html',
  styleUrls: ['./round.component.css']
})
export class RoundComponent implements OnInit {

  @Input()
  roundId: string

  constructor(private fb: FormBuilder, private db: AngularFireDatabase, private dialog: MatDialog) {
  }

  roundForm: FormGroup;

  state: string;

  tenses = TENSES

  sizes = SIZES

  path

  delegatePaths: Observable<string[]>

  bvPaths: Observable<string[]>

  editingDelegates = false

  editingDelegations = false

  showingProjects = false

  editingBv = false

  projects: Observable<Project[]>

  displayedColumns: string[] = ['keyword', 'name', 'delegations', 'df'];

  delegates: Observable<ValueName[]>

  bvDelegateId: string

  delegateTotalBv: Observable<number>

  smallSize = true

  ngOnInit() {
    this.path = "rounds/" + this.roundId
    this.roundForm = this.fb.group({
      name: [''],
      tense: [''],
      deadline: [''],
      size: ['']
    })
    this.delegatePaths = this.db.list("delegateRounds").snapshotChanges().pipe(
      map(
        snapshots => {
          return snapshots.map(snapshot => "delegateRounds/" + snapshot.key + "/" + this.roundId)
        })
    )
    this.delegates = this.db.list("delegates").snapshotChanges().pipe(
      map(
        snapshots => {
          return snapshots.map(snapshot => {
            return { value: snapshot.key, name: snapshot.payload.val()["name"] }
          })
        })
    )
    this.projects = this.calculateProjects()
    this.db.object("rounds/" + this.roundId + "/size").valueChanges().pipe(
      tap(size => {
        this.smallSize = size == "small"
      })
    ).subscribe()
  }

  delegateChanged(form: NgForm) {
    this.bvDelegateId = form.value["delegate"]
    this.bvPaths = this.db.list("bvRounds/" + this.roundId + "/" + this.bvDelegateId).snapshotChanges().pipe(
      map(
        snapshots => {
          return snapshots.map(snapshot => "bvRounds/" + this.roundId + "/" + this.bvDelegateId + "/" + snapshot.key)
        })
    )
    this.delegateTotalBv = this.db.object("delegateRounds/" + this.bvDelegateId + "/" + this.roundId + "/bv").valueChanges() as Observable<number>
  }

  addBv(form: NgForm) {
    if (form.valid) {
      var adding = false
      var addedCount = 0
      var roundCount = form.value["rounds"]
      this.db.list("rounds").snapshotChanges().pipe(
        take(1),
        tap(
          rounds => {
            rounds.forEach(
              round => {
                const roundId = round.key
                var originalRoundCount = null
                if (roundId == this.roundId) {
                  adding = true
                  originalRoundCount = roundCount
                }
                if (adding && addedCount < roundCount) {
                  this.db.list("bvRounds/" + roundId + "/" + this.bvDelegateId).push({
                    description: form.value["description"],
                    bv: form.value["bv"],
                    originalRoundCount: originalRoundCount
                  })
                  addedCount++
                }
              }
            )
          }
        )
      ).subscribe()
    }
  }

  changeHandler(state) {
    this.state = state
  }

  exportActions() {
    combineLatest(
      this.db.list("actions/" + this.roundId).snapshotChanges(),
      this.db.list("delegates").snapshotChanges(),
      this.db.list("delegations").snapshotChanges(),
      this.db.list("projects").valueChanges(),
      this.db.list("units").snapshotChanges(),
      (actions, delegates, delegations, projects, units) => {
        return { actions: actions, delegates: delegates, delegations: delegations, projects: projects, units: units }
      }
    ).pipe(
      take(1),
      tap(
        combined => {
          let data = combined.actions.map(snapshot => {
            let values = snapshot.payload.val()
            let project = findProject(combined.projects, values["identifier"], values["delegate"])
            let unit = findUnit(combined.units, values["identifier"])
            let identifier = (project != null) ? project["keyword"] : ((unit != null) ? unit.payload.val()["name"] : "")
            return [
              snapshot.key.substr(1), // Excel doesn't like - at the beginning
              findName(combined.delegates, values["delegate"]),
              findName(combined.delegations, values["delegation"]),
              values["title"] || "",
              values["description"] || "",
              findValueName(COUNTRIES, values["targetCountry"]),
              values["df"] || "",
              values["keyword"] || "",
              identifier,
              formatDescription(project, unit),
              formatInstructions(project, unit),
              values["result"] || ""
            ]
          })
          let options = {
            headers: ["ID akce", "Hráč", "Frakce", "Titulek", "Popis akce", "Lokace", "BV", "Klíčové slovo", "Identifikátor", "Popis", "Instrukce", "Výsledek"]
          };
          new ngxCsv(data, 'Export akcí ' + this.roundForm.controls.name.value, options);
        }
      )
    ).subscribe()
  }

  importActions(file) {
    let fileReader = new FileReader();
    fileReader.onload = (e) => {
      let papa = new Papa()
      papa.parse(fileReader.result as string, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          result.data.forEach(el => {
            this.db.object("actions/" + this.roundId + "/-" + el["ID akce"]).update({
              result: el["Výsledek"]
            })
          });
        }
      });
    }
    fileReader.readAsText(file.value.files[0]);
  }

  deleteActions() {
    this.dialog.open(DeleteConfirmDialogComponent, { data: "obsahu všech akcí" }).afterClosed().subscribe(
      result => {
        if (result) {
          this.db.list("actions/" + this.roundId).snapshotChanges().pipe(
            take(1),
            tap(
              snapshots => {
                snapshots.forEach(
                  snapshot => {
                    let action = snapshot.payload.val()
                    this.db.object("actions/" + this.roundId + "/" + snapshot.key).set(
                      {
                        delegate: action["delegate"],
                        delegation: action["delegation"],
                        type: action["type"],
                        visibility: "private"
                      })
                  }
                )
              }
            )
          ).subscribe()
          this.db.list("delegateRounds").snapshotChanges().pipe(
            take(1),
            tap(
              snapshots => {
                snapshots.forEach(
                  snapshot => {
                    this.db.object("delegateRounds/" + snapshot.key + "/" + this.roundId + "/markedAsSent").set(false)
                  }
                )
              }
            )
          ).subscribe()
        }
      }
    )
  }

  setSmallActions() {
    this.dialog.open(DeleteConfirmDialogComponent, { data: "všech akcí v tomto kole a vytvoření nových prázdných: 1 mise a 1 akce libovolné jednotky" }).afterClosed().subscribe(
      result => {
        if (result) {
          this.db.list("actions/" + this.roundId).remove()
          this.db.list("delegateRounds").snapshotChanges().pipe(
            take(1),
            tap(
              snapshots => {
                snapshots.forEach(
                  snapshot => {
                    let delegateId = snapshot.key
                    let delegationId = snapshot.payload.val()[this.roundId]["delegation"]
                    this.db.list("actions/" + this.roundId).push(
                      {
                        delegate: delegateId,
                        delegation: delegationId,
                        type: "mission",
                        visibility: "private",
                        title: "Mise"
                      })
                    this.db.list("actions/" + this.roundId).push(
                      {
                        delegate: delegateId,
                        delegation: delegationId,
                        type: "other",
                        visibility: "private",
                        title: "Akce libovolné jednotky"
                      })
                    this.db.object("delegateRounds/" + snapshot.key + "/" + this.roundId + "/markedAsSent").set(false)
                  }
                )
              }
            )
          ).subscribe()
        }
      }
    )
  }

  setLargeActions() {
    this.dialog.open(DeleteConfirmDialogComponent, { data: "všech akcí v tomto kole a vytvoření nových prázdných: 1 mise a akce pro každou aktivní jednotku" }).afterClosed().subscribe(
      result => {
        if (result) {
          this.db.list("actions/" + this.roundId).remove()
          combineLatest(
            this.db.list("delegateRounds").snapshotChanges(),
            this.db.list("units").snapshotChanges(),
            (delegateRounds, units) => {
              return { delegateRounds: delegateRounds, units: units }
            }
          )
            .pipe(
              take(1),
              tap(
                combined => {
                  combined.delegateRounds.forEach(
                    snapshot => {
                      let delegateId = snapshot.key
                      let delegationId = snapshot.payload.val()[this.roundId]["delegation"]
                      this.db.list("actions/" + this.roundId).push(
                        {
                          delegate: delegateId,
                          delegation: delegationId,
                          type: "mission",
                          visibility: "private",
                          title: "Mise"
                        })
                      combined.units.filter(snap => {
                        let unit = snap.payload.val()
                        return unit["delegate"] == delegateId && (unit["type"] == "active_hero" || unit["type"] == "army") && unit["state"] == "alive"
                      }).forEach(unitSnap => {
                        this.db.list("actions/" + this.roundId).push(
                          {
                            delegate: delegateId,
                            delegation: delegationId,
                            type: "unit",
                            visibility: "private",
                            title: unitSnap.payload.val()["name"],
                            identifier: unitSnap.key
                          })
                      })
                      this.db.object("delegateRounds/" + snapshot.key + "/" + this.roundId + "/markedAsSent").set(false)
                    }
                  )
                }
              )
            ).subscribe()
        }
      }
    )
  }

  setQuestions() {
    this.dialog.open(DeleteConfirmDialogComponent, 
      {data: "všech dekretů v tomto kole a vytvoření nových prázdných (1 dekret na jedno volební právo v Landsraadu)"})
      .afterClosed()
      .subscribe(
        result => {
          if (result) {
            // delete old questions and answers
            this.db.list("landsraad/questions", ref => ref.orderByChild("roundId").equalTo(this.roundId)).snapshotChanges().pipe(
              take(1),
              map(
                snapshots => {
                  snapshots.forEach(
                    snapshot => {
                      this.db.object(`landsraad/questions/${snapshot.key}`).remove()
                      this.db.object(`landsraad/answers/${snapshot.key}`).remove()
                    }
                  )
                }
              )
            ).subscribe()
            // create new questions and answers for each votingRight
            this.db.list("landsraad/votingRights").valueChanges().pipe(
              take(1),
              map(
                votingRights => {
                  votingRights.forEach(
                    votingRight => {
                      let delegateId = votingRight["controlledBy"]
                      let ref = this.db.list("landsraad/questions/").push({
                        questionType: "",
                        name: "",
                        byDelegateId: delegateId,
                        byVotingRight: votingRight["name"],
                        roundId: this.roundId,
                        hidden: false
                      })
                      const answers = ["ANO", "NE"]
                      answers.forEach(
                        answer => {
                          this.db.list(`landsraad/answers/${ref.key}`).push({name: answer.trim()})
                        }
                      )
                      this.db.object(`delegateRounds/${delegateId}/${this.roundId}/markedLandsraadQuestionsAsSent`).set(false)
                    }
                  )
                }
              )
            ).subscribe()
          }
        }
      )
  }

  deleteRound() {
    this.dialog.open(DeleteConfirmDialogComponent, { data: this.roundForm.controls.name.value }).afterClosed().subscribe(
      result => {
        if (result) {
          this.db.list("delegateRounds").snapshotChanges().pipe(
            take(1),
            tap(
              snapshots => {
                snapshots.forEach(
                  snapshot => {
                    this.db.object("delegateRounds/" + snapshot.key + "/" + this.roundId).remove()
                  }
                )
              }
            )
          ).subscribe()
          this.db.object("actions/" + this.roundId).remove()
          this.db.object(this.path).remove()
        }
      }
    )
  }

  exportBv() {
    combineLatest(
      this.db.list("bvRounds").snapshotChanges(),
      this.db.list("delegates").snapshotChanges(),
      this.db.list("rounds").snapshotChanges(),
      (bvRounds, delegates, rounds) => {
        return { bvRounds: bvRounds, delegates: delegates, rounds: rounds }
      }
    ).pipe(
      take(1),
      tap(
        combined => {
          var data = []
          var headers = ["Hráč", "Popis"]
          var roundColumn = 1
          let roundCount = combined.rounds.length
          combined.rounds.forEach(round => {
            let roundId = round.key
            let roundName = round.payload.val()["name"]
            headers.push(roundName)
            roundColumn++

            let bvsInRound = combined.bvRounds.find((row) => row.key == roundId);
            if (bvsInRound != null) {
              let val = bvsInRound.payload.val()
              Object.keys(val).forEach((delegateId) => {
                let delegateName = findName(combined.delegates, delegateId)
                let val2 = val[delegateId]
                Object.keys(val2).forEach((key) => {
                  let bv = val2[key]
                  let description = bv["description"]
                  let row = data.find(row => row[0] == delegateName && row[1] == description)
                  if (row == null) {
                    var rowData = [delegateName, description]
                    for (let index = 0; index < roundCount; index++) {
                      if (index + 2 == roundColumn) {
                        rowData.push(bv["bv"])
                      } else {
                        rowData.push(0)
                      }
                    }
                    // for import
                    rowData.push(delegateId)
                    for (let index = 0; index < roundCount; index++) {
                      if (index + 2 == roundColumn) {
                        rowData.push(key)
                      } else {
                        rowData.push("")
                      }
                    }

                    data.push(rowData)
                  } else {
                    row[roundColumn] = bv["bv"]
                    // for import
                    row[roundColumn + roundCount + 1] = key
                  }
                })
              });
            }

          });
          // For import
          headers.push("ID hráče")
          combined.rounds.forEach(round => {
            headers.push(round.key)
          })

          let options = {
            headers: headers
          };
          new ngxCsv(data, 'Export BV', options);
        }
      )
    ).subscribe()
  }

  importBv(file) {
    let fileReader = new FileReader();
    fileReader.onload = (e) => {
      let papa = new Papa()
      papa.parse(fileReader.result as string, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          let headers = result.meta.fields
          let descriptionIndex = headers.indexOf("Popis")
          let delegateIdIndex = headers.indexOf("ID hráče")
          let roundCount = delegateIdIndex - descriptionIndex - 1
          result.data.forEach(el => {
            let delegateId = el["ID hráče"]
            let description = el["Popis"]
            for (let bvColumn = descriptionIndex + 1; bvColumn < delegateIdIndex; bvColumn++) {
              let bv = parseInt(el[headers[bvColumn]])
              let roundId = headers[bvColumn + roundCount + 1]
              let changeId = el[roundId]
              if (bv != 0 && changeId != "") {
                this.db.object("bvRounds/" + roundId + "/" + delegateId + "/" + changeId).update({
                  bv: bv
                })
              } else if (bv == 0 && changeId != "") {
                this.db.object("bvRounds/" + roundId + "/" + delegateId + "/" + changeId).remove()
              } else if (bv != 0 && changeId == "") {
                this.db.list("bvRounds/" + roundId + "/" + delegateId).push({
                  description: description,
                  bv: bv,
                  originalRoundCount: 0
                })
              }
            }
          });
        }
      });
    }
    fileReader.readAsText(file.value.files[0]);
  }

  private calculateProjects(): Observable<Project[]> {
    return combineLatest<Project[]>(
      this.db.list("projects").valueChanges(),
      this.db.list("actions").snapshotChanges(),
      this.db.object("delegations").valueChanges(),
      (projects, actions, delegations) => {
        let actionsForThisAndPreviousRounds = []
        for (let i = 0; i < actions.length; i++) {
          let snap = actions[i]
          let roundId = snap.key
          let val = snap.payload.val()
          Object.keys(val).forEach((key) => {
            actionsForThisAndPreviousRounds.push(val[key]);
          });
          if (roundId == this.roundId) {
            break;
          }
        }
        let usedKeywords = actionsForThisAndPreviousRounds.map(action => action["keyword"])
        let uniqueKeywords = []
        return projects.filter(project => {
          let ok = usedKeywords.includes(project.keyword) && !uniqueKeywords.includes(project.keyword)
          if (ok) {
            uniqueKeywords.push(project["keyword"])
          }
          return ok
        }).map(project => {
          let relatedActions = actionsForThisAndPreviousRounds.filter(action => action["keyword"] != null && action["keyword"].toLowerCase().trim() == project["keyword"].toLowerCase().trim())
          let delegationNames = relatedActions.map(action => delegations[action["delegation"]]["name"]).join(", ")
          let spentDf = relatedActions.map(action => action["df"] || 0).reduce((sum, current) => sum + current)
          let dfOk = spentDf >= project["df"]
          let spentMainActions = relatedActions.filter(action => action["type"] == "mission" || action["type"] == "other").length
          let mainActionsOk = spentMainActions >= project["mainActions"]
          return <Project>{ keyword: project["keyword"], name: project["name"], delegations: delegationNames, df: spentDf + "/" + project["df"], mainActions: spentMainActions + "/" + project["mainActions"], dfOk: dfOk, mainActionsOk: mainActionsOk }
        }).sort((project1, project2) => project1.keyword.localeCompare(project2.keyword))
      }
    )
  }

  editDelegates() {
    this.editingDelegates = true
  }

  dontEditDelegates() {
    this.editingDelegates = false
  }

  editDelegations() {
    this.editingDelegations = true
  }

  editBv() {
    this.editingBv = true
  }

  showProjects() {
    this.showingProjects = true
  }
}

function findName(snapshots: AngularFireAction<DatabaseSnapshot<any>>[], id: string) {
  let snapshot = snapshots.find((row) => row.key == id);
  if (snapshot == null) {
    return "N/A"
  }
  return snapshot.payload.val()["name"]
}

function findProject(projects: any[], keyword: string, delegateId: string) {
  return projects.find((row) => {
    let sameProject = keyword != null && row["keyword"].toLowerCase().trim() == keyword.toLowerCase().trim() && row["delegate"] == delegateId
    return sameProject
  });
}

function findUnit(units: any[], id: string) {
  return units.find((snap) => {
    let unit = snap.key == id
    return unit
  });
}

function formatDescription(project: any, unit: any) {
  if (unit != null) {
    return unit.payload.val()["delegateInfo"]
  }
  if (project == null) {
    return ""
  }
  if (project["condition"] != null && project["condition"] != "") {
    return project["name"] + "\nPodmínka: " + project["condition"] + "\n\n" + project["benefit"]
  }
  if (project["benefit"] != null && project["benefit"] != "") {
    return project["name"] + "\n\n" + project["benefit"]
  }
  return ""
}

function formatInstructions(project: any, unit: any) {
  if (unit != null) {
    return unit.payload.val()["internalInfo"]
  }
  if (project == null) {
    return ""
  }
  if (project["instructions"] != null) {
    return project["instructions"]
  }
  return ""
}

interface Project {
  keyword: string;
  name: string;
  delegations: string;
  df: string;
  dfOk: boolean;
  mainActions: string;
  mainActionsOk: boolean;
}