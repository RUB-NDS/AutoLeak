import mongoengine


class Testcase(mongoengine.Document):

    inclusionmethod     = mongoengine.StringField( null=False, blank=False )
    difference          = mongoengine.StringField( null=False, blank=False )
    filetype            = mongoengine.StringField( null=False, blank=False )
    browser             = mongoengine.StringField( null=False, blank=False )

    # the state of the resource to be included
    includee_state      = mongoengine.BooleanField( )

    # from which config this test case was created
    testsuite           = mongoengine.StringField()

    length              = mongoengine.IntField()
    duration            = mongoengine.StringField()
    time                = mongoengine.StringField()
    logs                = mongoengine.StringField()

    # This contains the whole result of the diff-algorithm as json
    diff_results         = mongoengine.DictField()
    url                  = mongoengine.StringField()
    diff_tags            = mongoengine.ListField()

    def switch_state(self):
        self.includee_state = not self.includee_state
        self.save()

    def getName(self):
        return f"{self.inclusionmethod}/{self.difference}/{self.filetype}/{self.browser}"

    def __repr__(self):
        return f"<Diff {self.getName()}>"

    meta = {
        'indexes': [
             { 'fields': ['inclusionmethod', 'difference', 'filetype', 'browser'], 'unique': True },
             { 'fields': ['-time'] },
             { 'fields': ['-length']},
             { 'fields': ['-inclusionmethod']},
             { 'fields': ['-difference']},
             { 'fields': ['-filetype']},
             { 'fields': ['-browser']}
        ],
        'ordering': ['-time'],
        'auto_create_index': True,
    }

