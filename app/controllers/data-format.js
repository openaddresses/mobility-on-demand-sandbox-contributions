import Ember from 'ember';
import sharedActions from '../mixins/shared-actions';

export default Ember.Controller.extend(sharedActions, {
  columns: null,
  numberOfExamples: Ember.computed('model.submission.exampleRows', function(){
    return this.model.submission.get('exampleRows').length;
  }),
  columnHeadings: Ember.computed('model.webServiceResponse', function(){
    return this.model.webServiceResponse.get('source_data').fields;
  }),
  showAdditionalJoinButton: false,
  user_data: Ember.computed('model.webServiceResponse', function(){
    return this.model.webServiceResponse.get('source_data').results;
  }),
  currentField: Ember.computed('model.webServiceResponse', function(){
    if (this.model.webServiceResponse.get('conform').type === "csv"){
      return "lon";
    } else {
      return "number";
    }
  }),
  prevField: Ember.computed('currentField', function() {
    var prevFields = {
      lat: "lon",
      "number": "lat",
      "street": "number",
      "unit": "street",
      "city": "unit",
      "district": "city",
      "region": "district",
      "postcode": "region"
    };
    return prevFields[this.get('currentField')];
  }),
  nextField: Ember.computed('currentField', function(){
    var nextFields = {
      "lon": "lat",
      "lat": "number",
      "number": "street",
      "street": "unit",
      "unit": "city",
      "city": "district",
      "district": "region",
      "region": "postcode"
    };
    return nextFields[this.get('currentField')];
  }),
  showErrorState: false,
  showRequiredFieldsErrorState: false,
  showMore: false,
  errorMessages: [],
  requiredFieldsErrorMessages: [],
  resetErrorState: function () {
    Ember.set(this, 'showErrorState', false);
    Ember.set(this, 'errorMessages', []);
  },
  resetRequiredFieldsErrorState: function () {
    Ember.set(this, 'showRequiredFieldsErrorState', false);
    Ember.set(this, 'requiredFieldsErrorMessages', []);
  },
  checkFunctionRequired: function(){
    if (this.model.submission.get('oaFields')[this.get('currentField')].function === 'join' && this.model.submission.get('oaFields')[this.get('currentField')].fields.length < 2 || this.model.submission.get('oaFields')[this.get('currentField')].function === 'split'){
      Ember.set(this.model.submission.get('oaFields')[this.get('currentField')], "function", null);
    }
    if (this.model.submission.get('oaFields')[this.get('currentField')].function === "remove_prefix" || this.model.submission.get('oaFields')[this.get('currentField')].function === "remove_postfix"){
      if (!this.model.submission.get('oaFields')[this.get('currentField')].prefix_or_postfix){
        Ember.set(this.model.submission.get('oaFields')[this.get('currentField')], "function", null);
        if (this.get('currentField') === 'street'){
          Ember.set(this.model.submission.get('oaFields')[this.get('currentField')], "may_contain_units", false);
        }
      }
    }
  },
  actions: {
    toggleShowMore: function() {
      this.set('showMore', !this.showMore);
    },
    goToField: function(field){
      this.set('currentField', field);
    },
    prevField: function() {
      this.checkFunctionRequired();
      this.resetErrorState();
      this.set('currentField', this.get('prevField'));
    },
    nextField: function(){
      this.checkFunctionRequired();
      this.resetErrorState();
      this.set('currentField', this.get('nextField'));
    },
    chooseField: function(heading, column){
      Ember.set(this.model.submission.get('oaFields')[heading], "fields", []);
      this.model.submission.get('oaFields')[heading].fields.addObject(column);
      for (var i = 0; i < this.get('numberOfExamples'); i++){
        Ember.set(this.model.submission.get('exampleRows')[i], heading, [this.model.webServiceResponse.get('source_data').results[i][column]]);
      }
      this.resetErrorState();
    },
    addFunction: function(field, action){
      if (this.model.submission.get('oaFields')[field].fields.length > 0){
        this.resetErrorState();
        Ember.set(this.model.submission.get('oaFields')[field], "function", action);
        if (action === "join"){
          this.set('showAdditionalJoinDropdown', true);
        }
      } else {
        this.set('showErrorState', true);
        this.set('errorMessages', ['Select a column from the drop down to proceed']);
      }
    },
    removeFunction: function(field){
      if (this.model.submission.get('oaFields')[field].function === "join" && this.model.submission.get('oaFields')[field].fields.length > 1){
        Ember.set(this.model.submission.get('oaFields')[field], "fields", [this.model.submission.get('oaFields')[field].fields[0]]);
        this.set('showAdditionalJoinButton', false);
        Ember.set(this.model.submission.get('oaFields')[field], "function", null);
        this.set('showAdditionalJoinDropdown', false);
      } else if (this.model.submission.get('oaFields')[field].function !== "join" && this.model.submission.get('oaFields')[field].function !== "split"){
        Ember.set(this.model.submission.get('oaFields')[field], "function", "split");
        if (this.model.submission.get('oaFields')[field].prefix_or_postfix){
          Ember.set(this.model.submission.get('oaFields')[field], "prefix_or_postfix", null);
        } else if (field === "street" && this.model.submission.get('oaFields').street.may_contain_units === true){
          Ember.set(this.model.submission.get('oaFields').street, "may_contain_units", null);
        }

      } else {
        Ember.set(this.model.submission.get('oaFields')[field], "function", null);
      }
      for (var i = 0; i < this.get('numberOfExamples'); i++){
        var originalColumn = this.model.submission.get('oaFields')[field].fields[0];
        Ember.set(this.model.submission.get('exampleRows')[i], field, [this.model.webServiceResponse.get(
          'source_data').results[i][originalColumn]]);
      }
    },
    changeRoute: function(route){
      if (this.model.submission.get('oaFields').number.fields.length < 1 || this.model.submission.get('oaFields').street.fields.length < 1 || (this.get('store').peekAll('webServiceResponse').get('firstObject').get('conform').type === "csv" && (this.model.submission.get('oaFields').lat.fields.length < 1 || this.model.submission.get('oaFields').lon.fields.length < 1))){
        this.set('showRequiredFieldsErrorState', true);
        this.set('requiredFieldsErrorMessages', []);
        if (this.get('store').peekAll('webServiceResponse').get('firstObject').get('conform').type === "csv"){
          if (this.model.submission.get('oaFields').lon.fields.length < 1){
            this.get('requiredFieldsErrorMessages').push("Lon is required to proceed.");
          }
          if (this.model.submission.get('oaFields').lat.fields.length < 1){
            this.get('requiredFieldsErrorMessages').push("Lat is required to proceed.");
          }
        }
        if (this.model.submission.get('oaFields').number.fields.length < 1){
          this.get('requiredFieldsErrorMessages').push("Number is required to proceed.");
        }
        if (this.model.submission.get('oaFields').street.fields.length < 1){
          this.get('requiredFieldsErrorMessages').push("Street is required to proceed.");
        }
      } else {
        this.resetRequiredFieldsErrorState();
        this.checkFunctionRequired();
        this.transitionToRoute(route);
      }
    }
  }
});
