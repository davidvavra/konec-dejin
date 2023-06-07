import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-basic-info',
  templateUrl: './basic-info.component.html',
  styleUrls: ['./basic-info.component.css']
})
export class BasicInfoComponent implements OnInit {

  constructor() {
  }

  ngOnInit() {
  }

  title = "Duna: Válka Assasinů"

  signUp() {
    window.location.href = "https://docs.google.com/forms/d/e/1FAIpQLSfT83hkBZmbaiyqlHhlfLD4xcYpS7vaTKKBthOZh-MpfaE4KQ/viewform?usp=sf_link"
  }

  factions() {
    window.location.href = "https://docs.google.com/document/d/13cSDRGej7Rt57btu0M_lW-mvDDAm1xd9ozMEO4JLSKg/edit?usp=sharing"
  }
}
