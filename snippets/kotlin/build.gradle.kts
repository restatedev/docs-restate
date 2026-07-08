plugins {
  application
  kotlin("jvm") version "2.4.0"
  kotlin("plugin.serialization") version "2.4.0"
  kotlin("plugin.allopen") version "2.4.0"
  id("com.diffplug.spotless") version "8.8.0"
}

allOpen {
  annotation("dev.restate.sdk.annotation.Service")
  annotation("dev.restate.sdk.annotation.VirtualObject")
  annotation("dev.restate.sdk.annotation.Workflow")
}

repositories {
  // Maven local for local testing
  //  mavenLocal()

  mavenCentral()
}

dependencies {
  // Restate SDK
  implementation(libs.restate.sdk.http.kotlin)
  implementation(libs.restate.sdk.lambda.kotlin)
  implementation(libs.restate.sdk.request.identity)
  implementation(libs.restate.sdk.testing)
  implementation(libs.restate.sdk.interceptor.opentelemetry)
  implementation(libs.restate.sdk.interceptor.micrometer)
  implementation(libs.opentelemetry.sdk)

  implementation(libs.kotlinx.coroutines.core)
  implementation(libs.kotlinx.coroutines.test)
  implementation(libs.kotlinx.serialization.json)

  implementation(libs.junit.jupiter.api)

  implementation(libs.log4j.core)
}

kotlin { jvmToolchain(25) }

// Set main class
application {
  // Enable native access to avoid the JDK native-access warning printed at startup on JDK 23+
  applicationDefaultJvmArgs = listOf("--enable-native-access=ALL-UNNAMED")

  if (project.hasProperty("mainClass")) {
    mainClass.set(project.property("mainClass") as String)
  } else {
    mainClass.set("develop.GreeterKt")
  }
}

spotless {
  kotlin {
    targetExclude("build/generated/**/*.kt")
    ktfmt()
  }
  kotlinGradle { ktfmt() }
}
