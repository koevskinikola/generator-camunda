'use strict';
const Generator = require('yeoman-generator');
const chalk = require('chalk');
const yosay = require('yosay');

module.exports = class extends Generator {

  welcomeUser() {
    // Have Yeoman greet the user.
    this.log(
      yosay(`Welcome to the ${chalk.red('Camunda BPM Platform')} generator!`)
    );
  }

  pickApplicationServer_name() {

    const prompts = [
      {
        type: 'list',
        name: 'applicationServer',
        message: 'What application server would you like to use?',
        choices: ['Apache Tomcat', 'Wildfly Application Server', 'JBoss Application Server', 'IBM WebSphere Application Server', 'Oracle WebLogic Server 12c (12R1,12R2)'],
        default: 0
      }
    ];

    return this.prompt(prompts).then(props => {
      // To access props later use this.props.applicationServer;
      this.props = props;
    });
  }

  pickApplicationServer_version() {

    var applicationServerVersions = {
      "Apache Tomcat": ["7.0", "8.0", "9.0"],
      "Wildfly Application Server": ["8.2", "10.1", "11.0", "12.0", "13.0", "14.0", "15.0", "16.0"],
      "JBoss Application Server": ["7.2"],
      "IBM WebSphere Application Server": ["8.5", "9.0"],
      "Oracle WebLogic Server 12c": ["12R1", "12R2"]
    }

    var versions = applicationServerVersions[this.props.applicationServer];

    const prompts = [
      {
        type: 'list',
        name: 'applicationServerVersion',
        message: 'What application server version would you like to use?',
        choices: versions,
        default: versions.length - 1
      }
    ];

    return this.prompt(prompts).then(props => {
      // To access props later use this.props.applicationServerVersion;
      this.props = props;
    });
  }

  pickJdkVersion() {

    var jdkVersions = [7, 8, 9, 10, 11, 12]

    const prompts = [
      {
        type: 'list',
        name: 'jdkVersion',
        message: 'What version of Java are you using?',
        choices: jdkVersions,
        default: jdkVersions.length - 1
      }
    ];

    return this.prompt(prompts).then(props => {
      // To access props later use this.props.jdkVersion;
      this.props = props;
    });
  }

  pickDatabase_name() {

    const prompts = [
      {
        type: 'list',
        name: 'database',
        message: 'What database would you like to use?',
        choices: ['H2', 'MySQL', 'MariaDB', 'PostgreSQL', 'Microsoft SQL Server', 'Oracle', 'IBM DB2'],
        default: 0
      }
    ];

    return this.prompt(prompts).then(props => {
      // To access props later use this.props.database;
      this.props = props;
    });
  }

  pickDatabase_version() {

    var databaseVersions = {
      "H2": ["1.4"],
      "MySQL": ["5.6", "5.7"],
      "MariaDB": ["10.0", "10.2", "10.3"],
      "PostgreSQL": ["9.1", "9.3", "9.4", "9.6", "10.4", "10.7", "11.1", "11.2"],
      "Microsoft SQL Server": ["2008 R2", "2012", "2014", "2016", "2017"],
      "Oracle": ["10g", "11g", "12c", "18c"],
      "IBM DB2": ["9.7", "10.1", "10.5", "11.1"],
    }

    var databasePorts = {
      "H2": "9999",
      "MySQL": "3306",
      "MariaDB": "3306",
      "PostgreSQL": "5432",
      "Microsoft SQL Server": "1433",
      "Oracle": "1521",
      "IBM DB2": "50000",
    };

    var versions = databaseVersions[this.props.database];
    var defaultPort = databasePorts[this.props.database];

    const prompts = [
      {
        type: 'list',
        name: 'databaseVersion',
        message: 'What database version would you like to use?',
        choices: versions,
        default: versions.length - 1
      },
      {
        type: 'input',
        name: 'databaseAddress',
        message: 'Enter your database address?',
        default: "127.0.0.1",
        validate: function(value) {
          var pass = value.match(
            /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/i
          );
          if (pass) {
            return true;
          }

          return 'Please enter a valid IPv4 address';
        }
      },
      {
        type: 'input',
        name: 'databasePort',
        message: 'Enter your database port?',
        default: defaultPort,
        validate: function(value) {
          var pass = value.match(
            /^([0-9]{1,5})$/i
          );
          if (pass) {
            return true;
          }

          return 'Please enter a valid IPv4 port.';
        }
      },
      {
        type: 'input',
        name: 'databaseUser',
        message: 'Please enter your database user:',
        default: "camunda"
      },
     {
       type: 'password',
       message: 'Please enter your database password:',
       name: 'databasePassword',
       mask: '*'
     }
    ];

    return this.prompt(prompts).then(props => {
      // To access props later use this.props.databaseVersion;
      this.props = props;
    });
  }

  enterDatabase_info() {



    const prompts = [

    ];

    return this.prompt(prompts).then(props => {
      // To access props later use this.props.databaseVersion;
      this.props = props;
    });
  }

  writing() {
    this.fs.copy(
      this.templatePath('dummyfile.txt'),
      this.destinationPath('dummyfile.txt')
    );
  }

  install() {
//    this.installDependencies();
  }
};
