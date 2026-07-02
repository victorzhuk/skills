package bdd_test

import (
	"context"
	"os"
	"testing"

	"github.com/cucumber/godog"
)

func TestBDD(t *testing.T) {
	if err := os.MkdirAll("reports/bdd", 0o755); err != nil {
		t.Fatal(err)
	}

	suite := godog.TestSuite{
		Name: "bdd",
		TestSuiteInitializer: func(ctx *godog.TestSuiteContext) {
			InitializeTestSuite(t.Context(), ctx)
		},
		ScenarioInitializer: InitializeScenario,
		Options: &godog.Options{
			Format:   bddFormat(),
			Paths:    []string{"features"},
			Tags:     os.Getenv("BDD_TAGS"),
			TestingT: t,
		},
	}

	if suite.Run() != 0 {
		t.Fatal("non-zero BDD status")
	}
}

func bddFormat() string {
	if os.Getenv("CI") != "" {
		return "pretty,junit:reports/bdd/junit.xml,cucumber:reports/bdd/cucumber.json"
	}
	return "pretty"
}

func InitializeTestSuite(ctx context.Context, suite *godog.TestSuiteContext) {}

func InitializeScenario(ctx *godog.ScenarioContext) {}
