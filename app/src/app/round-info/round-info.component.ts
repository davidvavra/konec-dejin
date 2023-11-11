import { Component, OnInit, Input } from '@angular/core';
import { combineLatest, Observable } from 'rxjs';
import { AngularFireDatabase } from '@angular/fire/database';
import { RoundInfo } from '../model';
import { flatMap } from 'rxjs/operators';
import { AngularFireAuth } from '@angular/fire/auth';

@Component({
  selector: 'app-round-info',
  templateUrl: './round-info.component.html',
  styleUrls: ['./round-info.component.css']
})
export class RoundInfoComponent implements OnInit {

  constructor(public db: AngularFireDatabase, public auth: AngularFireAuth) { }

  @Input()
  roundId: string

  @Input()
  spentDf: Observable<number>

  roundInfo: Observable<RoundInfo>

  ngOnInit() {
    let delegateId = this.auth.auth.currentUser.uid
    this.roundInfo = this.db.object("delegateRounds/" + delegateId + "/" + this.roundId).valueChanges().pipe(
      flatMap((delegateRound, _) => {
        let delegationId = delegateRound["delegation"];
        return combineLatest<RoundInfo>(
          this.db.object("rounds/" + this.roundId).valueChanges(),
          this.db.object("delegations/" + delegationId).valueChanges(),
          this.spentDf,
          this.db.list("bvRounds/" + this.roundId + "/" + delegateId).valueChanges(),
          this.db.list("landsraad/votingRights", ref => ref.orderByChild("controlledBy").equalTo(delegateId)).valueChanges(),
          (round, delegation, spentDf, bvs, votingRights) => {
            let presentRound = round["tense"] == "present"
            let availableDf = delegateRound["bv"];
            let df = (presentRound) ? availableDf - spentDf : spentDf
            let smallSize = round["size"] == "small"
            let sizeName = smallSize ? "malé" : "velké"
            let hasVotingRight = votingRights.length && votingRights.length >= 0
            return {
              name: delegation["name"],
              flag: delegation["flag"],
              deadline: round["deadline"],
              presentRound: presentRound,
              message: delegateRound["message"],
              availableDf: availableDf,
              df: df,
              bvs: bvs,
              smallSize: smallSize,
              sizeName: sizeName,
              hasVotingRight: hasVotingRight
            }
          }
        )
      }
      ))
  }

}
