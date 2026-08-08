use std::ops::Deref;

use syn::Ident;

pub struct Symbol(&'static str);

// The attribute names that mark a struct/enum for automatic TypeScript
// generation. `Props` implies `Type` (it does everything `Type` does, plus a
// `Response` conversion), so a `#[Props]` struct is generated too.
pub const TYPE_TRAIT: Symbol = Symbol("Type");
pub const PROPS_TRAIT: Symbol = Symbol("Props");

impl PartialEq<Symbol> for Ident {
    fn eq(&self, word: &Symbol) -> bool {
        self == word.0
    }
}

impl PartialEq<Symbol> for &Ident {
    fn eq(&self, word: &Symbol) -> bool {
        *self == word.0
    }
}

impl Deref for Symbol {
    type Target = &'static str;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}
