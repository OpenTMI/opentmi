/* eslint-disable */
const mockTestResults = `
  <testsuite id="codereview.cobol.analysisProvider" name="COBOL Code Review" tests="45" failures="17" time="0.001">
    <system-out>raw_system_out_data</system-out>
    <system-err>raw_system_err_data</system-err>
    <testcase id="codereview.cobol.rules.ProgramIdRule" name="Use a program name that matches the source file name" time="0.001">
      <failure message="PROGRAM.cbl:2 Use a program name that matches the source file name" type="WARNING">
WARNING: Use a program name that matches the source file name
Category: COBOL Code Review – Naming Conventions
File: /project/PROGRAM.cbl
Line: 2
      </failure>
    </testcase>
    <testcase id="codereview.cobol.rules.ProgramId" name="Use a program name that matches the source file name" time="0.031">
      <failure message="PROGRAM.cbl:6 Use a program name that matches the source file name" type="WARNING">
WARNING: Use an id that matches the source file name
Category: COBOL Code Review – Naming Conventions
File: /project/PROGRAM.cbl
Line: 6
      </failure>
    </testcase>
  </testsuite>`;

const badMockTestResults = `
  <testsuite id="codereview.cobol.analysisProvider" name="COBOL Code Review" tests="45" failures="17" time="0.001">
    <system-out>raw_system_out_data</system-out>
    <system-err>raw_system_err_data</system-err>
    <testcase id="codereview.cobol.rules.ProgramIdRule" name="Use a program name that matches the source file name" time="0.001">
      <fail message="PROGRAM.cbl:2 Use a program name that matches the source file name" type="WARNING">
WARNING: Use a program name that matches the source file name
Category: COBOL Code Review – Naming Conventions
File: /project/PROGRAM.cbl
Line: 2
      </fail>
    </testcase>
    <testcase id="codereview.cobol.rules.ProgramId" name="Use a program name that matches the source file name" time="0.031">
      <failure message="PROGRAM.cbl:6 Use a program name that matches the source file name" type="WARNING">
WARNING: Use an id that matches the source file name
Category: COBOL Code Review – Naming Conventions
File: /project/PROGRAM.cbl
Line: 6
      </failure>
    </testcase>
  </testsuite>`;

module.exports = {
  valid: mockTestResults,
  typo: badMockTestResults
};
