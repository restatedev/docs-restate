package develop

// <start_state_keys>
// These imports provide extension methods with reified generics
import dev.restate.sdk.kotlin.*

// Primitive types
val myString = stateKey<String>("my-string")
// Generic types
val myMap = stateKey<Map<String, String>>("my-map")
// Custom generic type
val myPerson = stateKey<Person<String>>("my-person")

// <end_state_keys>

data class Person<T>(val t: T)
